import type {
  HardwareInfo,
  GpuInfo,
  AppRequirement,
  ComponentJudgment,
  SpecCheckResult,
  JudgmentLevel,
  ConfidenceLevel,
  SpecRequirement,
} from "../types/hardware";

// ─── GPU tier table ───────────────────────────────────────────────────────────
// Higher tier = more capable. Cross-vendor tiers are approximate.

interface GpuTierRule {
  pattern: RegExp;
  vendor: "nvidia" | "amd" | "intel" | "other";
  tier: number;
}

const GPU_TIER_RULES: GpuTierRule[] = [
  // NVIDIA
  { pattern: /RTX\s*50[0-9]{2}/i,  vendor: "nvidia", tier: 10 },
  { pattern: /RTX\s*40[0-9]{2}/i,  vendor: "nvidia", tier: 9  },
  { pattern: /RTX\s*30[0-9]{2}/i,  vendor: "nvidia", tier: 8  },
  { pattern: /RTX\s*20[0-9]{2}/i,  vendor: "nvidia", tier: 7  },
  { pattern: /GTX\s*16[0-9]{2}/i,  vendor: "nvidia", tier: 6  },
  { pattern: /GTX\s*10[0-9]{2}/i,  vendor: "nvidia", tier: 5  },
  { pattern: /GTX\s*9[0-9]{2}/i,   vendor: "nvidia", tier: 4  },
  { pattern: /GTX\s*[78][0-9]{2}/i, vendor: "nvidia", tier: 3 },
  { pattern: /GTX\s*6[0-9]{2}/i,   vendor: "nvidia", tier: 2  },
  { pattern: /GT\s*[0-9]{3}/i,     vendor: "nvidia", tier: 1  },
  // AMD
  { pattern: /RX\s*7[0-9]{3}/i,    vendor: "amd", tier: 9  },
  { pattern: /RX\s*6[0-9]{3}/i,    vendor: "amd", tier: 8  },
  { pattern: /RX\s*5[0-9]{3}/i,    vendor: "amd", tier: 7  },
  { pattern: /RX\s*Vega/i,         vendor: "amd", tier: 6  },
  { pattern: /RX\s*[45][0-9]{2}/i, vendor: "amd", tier: 5  },
  { pattern: /R9\s*[0-9]+/i,       vendor: "amd", tier: 4  },
  { pattern: /R7\s*[0-9]+/i,       vendor: "amd", tier: 3  },
  { pattern: /HD\s*[0-9]{4}/i,     vendor: "amd", tier: 2  },
  // Intel
  { pattern: /Arc\s*A[0-9]{3}/i,   vendor: "intel", tier: 6 },
  { pattern: /Iris\s*Xe/i,         vendor: "intel", tier: 3 },
  { pattern: /UHD\s*[0-9]+/i,      vendor: "intel", tier: 2 },
  { pattern: /HD\s*(Graphics\s*)?[0-9]{3,4}/i, vendor: "intel", tier: 1 },
];

interface GpuClassification {
  tier: number;
  vendor: "nvidia" | "amd" | "intel" | "other";
  modelNumber: number | null;
}

const LEVEL_RANK: Record<JudgmentLevel, number> = {
  met: 3,
  borderline: 2,
  unknown: 1,
  unmet: 0,
};

const CONFIDENCE_RANK: Record<ConfidenceLevel, number> = {
  high: 2,
  medium: 1,
  low: 0,
};

function pickBetterJudgment(current: ComponentJudgment, candidate: ComponentJudgment): ComponentJudgment {
  const levelDelta = LEVEL_RANK[candidate.level] - LEVEL_RANK[current.level];
  if (levelDelta > 0) return candidate;
  if (levelDelta < 0) return current;

  const confDelta = CONFIDENCE_RANK[candidate.confidence] - CONFIDENCE_RANK[current.confidence];
  if (confDelta > 0) return candidate;
  if (confDelta < 0) return current;

  return current;
}

function splitAlternatives(spec: string): string[] {
  return spec
    .split(/\s*(?:\/|,|\bor\b|\b또는\b)\s*/i)
    .map(part => part.trim())
    .filter(Boolean);
}

function classifyGpu(name: string): GpuClassification | null {
  for (const rule of GPU_TIER_RULES) {
    if (rule.pattern.test(name)) {
      const numMatch = name.match(/\b(\d{3,4})\b/);
      return {
        tier: rule.tier,
        vendor: rule.vendor,
        modelNumber: numMatch ? parseInt(numMatch[1]) : null,
      };
    }
  }
  return null;
}

function isLikelyIntegratedGpu(gpu: GpuInfo): boolean {
  if (gpu.is_integrated) return true;

  const name = gpu.name.toLowerCase();
  const manufacturer = gpu.manufacturer.toLowerCase();

  if (manufacturer === "intel") {
    return !name.includes("arc");
  }

  if (manufacturer === "amd") {
    return (
      name.includes("vega") ||
      name.includes("radeon graphics") ||
      name.includes("radeon(tm) graphics") ||
      name.includes("integrated graphics") ||
      name.includes("apu") ||
      /\b\d{3}m\b/i.test(name)
    );
  }

  return false;
}

function judgeGpuAgainstRequirement(
  gpu: GpuInfo,
  req: SpecRequirement,
  reqGpuLabel?: string
): ComponentJudgment {
  if (isLikelyIntegratedGpu(gpu)) {
    if (req.allow_integrated_gpu) {
      return { level: "met", confidence: "medium", reason: "내장 그래픽 허용 사양입니다" };
    }
    if (!req.gpu && !req.vram_gb) {
      return { level: "met", confidence: "medium", reason: "내장 그래픽으로 가능한 수준의 요구 사양입니다 (추정)" };
    }
    return { level: "unmet", confidence: "high", reason: "내장 그래픽 — 외장 GPU가 필요합니다" };
  }

  const userClass = classifyGpu(gpu.name);
  const reqLabel = reqGpuLabel ?? req.gpu;

  if (!reqLabel && !req.vram_gb) {
    return { level: "met", confidence: "medium", reason: "GPU 요구 사양 없음" };
  }

  if (!userClass) {
    if (req.vram_gb && gpu.vram_gb != null) {
      const vramOk = gpu.vram_gb >= req.vram_gb;
      return {
        level: vramOk ? "borderline" : "unmet",
        confidence: "low",
        reason: vramOk
          ? `GPU 모델 인식 불가 — VRAM ${gpu.vram_gb.toFixed(0)}GB / ${req.vram_gb}GB 필요 (추정)`
          : `GPU 모델 인식 불가 — VRAM ${gpu.vram_gb.toFixed(0)}GB로 부족 (${req.vram_gb}GB 필요)`,
      };
    }
    return { level: "unknown", confidence: "low", reason: "GPU 모델을 인식하지 못해 판정할 수 없습니다" };
  }

  let reqClass: GpuClassification | null = null;
  if (reqLabel) reqClass = classifyGpu(reqLabel);

  if (!reqClass) {
    // GPU string exists but not parseable — fall back to VRAM only
    if (req.vram_gb && gpu.vram_gb != null) {
      const vramOk = gpu.vram_gb >= req.vram_gb;
      return {
        level: vramOk ? "borderline" : "unmet",
        confidence: "low",
        reason: vramOk
          ? `요구 GPU 파싱 불가 — VRAM ${gpu.vram_gb.toFixed(0)}GB / ${req.vram_gb}GB 충족 (추정)`
          : `VRAM ${gpu.vram_gb.toFixed(0)}GB, ${req.vram_gb}GB 필요`,
      };
    }
    return { level: "unknown", confidence: "low", reason: "요구 GPU를 인식하지 못해 판정할 수 없습니다" };
  }

  const tierDiff = userClass.tier - reqClass.tier;

  // Check VRAM as secondary
  const vramReq = req.vram_gb ?? null;
  const vramOk = vramReq == null || gpu.vram_gb == null || gpu.vram_gb >= vramReq;
  const vramReason = vramReq && gpu.vram_gb != null
    ? ` · VRAM ${gpu.vram_gb.toFixed(0)}GB / ${vramReq}GB ${gpu.vram_gb >= vramReq ? "충족" : "부족"}`
    : "";

  if (tierDiff >= 1) {
    const level: JudgmentLevel = vramOk ? "met" : "borderline";
    return {
      level,
      confidence: "high",
      reason: `${gpu.name} — 요구 GPU(${reqLabel ?? req.gpu ?? ""})보다 높은 등급${vramReason}`,
    };
  }

  if (tierDiff === 0) {
    const sameVendor = userClass.vendor === reqClass.vendor;
    if (sameVendor && userClass.modelNumber != null && reqClass.modelNumber != null) {
      const modelOk = userClass.modelNumber >= reqClass.modelNumber;
      const level: JudgmentLevel = modelOk ? (vramOk ? "met" : "borderline") : "borderline";
      const conf: ConfidenceLevel = "medium";
      return {
        level,
        confidence: conf,
        reason: modelOk
          ? `동일 계열, 동급 이상 모델${vramReason}`
          : `동일 계열이지만 하위 모델 (${gpu.name})${vramReason}`,
      };
    }
    // Different vendors, same tier
    const level: JudgmentLevel = vramOk ? "met" : "borderline";
    return {
      level,
      confidence: "medium",
      reason: `유사한 성능대 GPU로 추정${vramReason}`,
    };
  }

  if (tierDiff === -1) {
    return {
      level: "borderline",
      confidence: "medium",
      reason: `요구 GPU보다 한 등급 낮음 — 설정을 낮추면 가능할 수 있습니다${vramReason}`,
    };
  }

  return {
    level: "unmet",
    confidence: "high",
    reason: `GPU 성능이 부족합니다 (${gpu.name} < 요구 ${reqLabel ?? req.gpu ?? ""})${vramReason}`,
  };
}

// ─── GPU comparison ───────────────────────────────────────────────────────────

function judgeGpu(gpu: GpuInfo, req: SpecRequirement): ComponentJudgment {
  if (gpu.is_integrated && req.allow_integrated_gpu) {
    return { level: "met", confidence: "medium", reason: "내장 그래픽 허용 사양입니다" };
  }

  const gpuAlternatives = req.gpu ? splitAlternatives(req.gpu) : [];
  if (gpuAlternatives.length > 1) {
    return gpuAlternatives
      .map((alt) => judgeGpuAgainstRequirement(gpu, req, alt))
      .reduce(pickBetterJudgment);
  }

  return judgeGpuAgainstRequirement(gpu, req);
}

// ─── CPU generation estimation ────────────────────────────────────────────────

function estimateIntelGenScore(name: string): number | null {
  const modelMatch = name.match(/i[3579]\s*[- ]\s*(\d{4,5})/i);
  if (modelMatch) {
    const digits = modelMatch[1];
    const gen = digits.length === 5 ? parseInt(digits.slice(0, 2)) : parseInt(digits.slice(0, 1));
    return Number.isFinite(gen) ? gen * 10 : null;
  }

  if (/Core\s*2/i.test(name)) return 5;
  return null;
}

function estimateRyzenGenScore(name: string): number | null {
  const modelMatch = name.match(/Ryzen\s+\d+\s+(\d{4})/i);
  if (modelMatch) {
    const gen = parseInt(modelMatch[1].slice(0, 1));
    return Number.isFinite(gen) ? gen * 10 : null;
  }

  const seriesMatch = name.match(/Ryzen.*?(\d{4})\s*series/i);
  if (seriesMatch) {
    const gen = parseInt(seriesMatch[1].slice(0, 1));
    return Number.isFinite(gen) ? gen * 10 : null;
  }

  if (/FX-\d{4}/i.test(name)) return 20;
  return null;
}

function estimateCpuGenScore(name: string): number | null {
  return estimateIntelGenScore(name) ?? estimateRyzenGenScore(name);
}

// ─── CPU comparison ───────────────────────────────────────────────────────────

function judgeCpu(
  cpuName: string,
  cpuCores: number,
  cpuMaxClockMhz: number,
  req: SpecRequirement
): ComponentJudgment {
  const cpuAlternatives = req.cpu ? splitAlternatives(req.cpu) : [];
  if (cpuAlternatives.length > 1) {
    return cpuAlternatives
      .map((alt) => judgeCpuAgainstRequirement(cpuName, cpuCores, cpuMaxClockMhz, req, alt))
      .reduce(pickBetterJudgment);
  }

  return judgeCpuAgainstRequirement(cpuName, cpuCores, cpuMaxClockMhz, req);
}

function judgeCpuAgainstRequirement(
  cpuName: string,
  cpuCores: number,
  cpuMaxClockMhz: number,
  req: SpecRequirement,
  reqCpuLabel?: string
): ComponentJudgment {
  const reqCores = req.cpu_cores;
  const reqClockGhz = req.cpu_clock_ghz;
  const userClockGhz = cpuMaxClockMhz / 1000;

  if (!reqCores && !reqClockGhz) {
    return { level: "met", confidence: "medium", reason: "CPU 수치 요구 사양 없음" };
  }

  const coresOk = reqCores == null || cpuCores >= reqCores;
  const clockOk = reqClockGhz == null || userClockGhz >= reqClockGhz;

  const coresReason = reqCores ? `코어 ${cpuCores} / ${reqCores}개 필요` : "";
  const clockReason = reqClockGhz ? `클럭 ${userClockGhz.toFixed(1)} / ${reqClockGhz.toFixed(1)}GHz 필요` : "";
  const specReason = [coresReason, clockReason].filter(Boolean).join(", ");

  const userGenScore = estimateCpuGenScore(cpuName);
  const reqGenScore = reqCpuLabel ? estimateCpuGenScore(reqCpuLabel) : req.cpu ? estimateCpuGenScore(req.cpu) : null;

  const genTooOld = userGenScore != null && reqGenScore != null && userGenScore < reqGenScore - 20;

  if (coresOk && clockOk) {
    if (genTooOld) {
      return {
        level: "borderline",
        confidence: "medium",
        reason: `${specReason} 충족이지만 세대가 낮아 실제 성능은 다를 수 있습니다${reqCpuLabel ? ` (${reqCpuLabel})` : ""}`,
      };
    }
    return {
      level: "met",
      confidence: userGenScore != null ? "high" : "medium",
      reason: specReason ? `${specReason} 충족${reqCpuLabel ? ` (${reqCpuLabel})` : ""}` : "CPU 사양 충족",
    };
  }

  if (coresOk && !clockOk) {
    return {
      level: "borderline",
      confidence: "medium",
      reason: `${specReason} — 클럭이 다소 낮습니다${reqCpuLabel ? ` (${reqCpuLabel})` : ""}`,
    };
  }

  if (!coresOk && clockOk) {
    // More cores can sometimes compensate lower count if clock is fine
    return {
      level: "borderline",
      confidence: "medium",
      reason: `${specReason} — 코어 수가 부족합니다${reqCpuLabel ? ` (${reqCpuLabel})` : ""}`,
    };
  }

  return {
    level: "unmet",
    confidence: "high",
    reason: `${specReason} 미달${reqCpuLabel ? ` (${reqCpuLabel})` : ""}`,
  };
}

// ─── RAM comparison ───────────────────────────────────────────────────────────

function judgeRam(totalGb: number, req: SpecRequirement): ComponentJudgment {
  if (!req.ram_gb) {
    return { level: "met", confidence: "high", reason: "RAM 요구 사양 없음" };
  }
  const diff = totalGb - req.ram_gb;
  if (diff >= 0) {
    return {
      level: "met",
      confidence: "high",
      reason: `${totalGb.toFixed(0)}GB / ${req.ram_gb}GB 필요 충족`,
    };
  }
  return {
    level: "unmet",
    confidence: "high",
    reason: `${totalGb.toFixed(0)}GB — ${req.ram_gb}GB 필요 (${Math.abs(diff).toFixed(0)}GB 부족)`,
  };
}

// ─── Storage comparison ───────────────────────────────────────────────────────

function judgeStorage(
  drives: HardwareInfo["drives"],
  req: SpecRequirement
): ComponentJudgment {
  if (!req.storage_gb) {
    return { level: "met", confidence: "high", reason: "저장 공간 요구 사양 없음" };
  }

  // Use the drive with the most free space
  const bestDrive = drives.reduce(
    (best, d) => (d.free_gb > best.free_gb ? d : best),
    drives[0]
  );

  if (!bestDrive) {
    return { level: "unknown", confidence: "low", reason: "드라이브 정보를 읽을 수 없습니다" };
  }

  if (bestDrive.free_gb >= req.storage_gb) {
    return {
      level: "met",
      confidence: "high",
      reason: `[${bestDrive.letter}] 여유 ${bestDrive.free_gb.toFixed(0)}GB / ${req.storage_gb}GB 필요 충족`,
    };
  }

  // Check if any drive can handle it
  const anyOk = drives.find(d => d.free_gb >= req.storage_gb!);
  if (anyOk) {
    return {
      level: "met",
      confidence: "high",
      reason: `[${anyOk.letter}] 여유 ${anyOk.free_gb.toFixed(0)}GB / ${req.storage_gb}GB 필요 충족`,
    };
  }

  return {
    level: "unmet",
    confidence: "high",
    reason: `여유 공간 부족 — 최대 ${bestDrive.free_gb.toFixed(0)}GB, ${req.storage_gb}GB 필요`,
  };
}

// ─── Overall judgment ─────────────────────────────────────────────────────────

function deriveOverall(
  judgments: ComponentJudgment[]
): { overall: JudgmentLevel; confidence: ConfidenceLevel } {
  const levels = judgments.map(j => j.level);
  const confs = judgments.map(j => j.confidence);

  let overall: JudgmentLevel;
  if (levels.some(l => l === "unmet")) {
    overall = "unmet";
  } else if (levels.every(l => l === "met" || l === "unknown")) {
    overall = levels.some(l => l === "unknown") ? "borderline" : "met";
  } else if (levels.some(l => l === "borderline")) {
    overall = "borderline";
  } else {
    overall = "unknown";
  }

  const confRank: Record<ConfidenceLevel, number> = { high: 2, medium: 1, low: 0 };
  const minConf = confs.reduce<ConfidenceLevel>(
    (min, c) => confRank[c] < confRank[min] ? c : min,
    "high"
  );

  return { overall, confidence: minConf };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function checkSpec(
  hw: HardwareInfo,
  app: AppRequirement,
  tier: "minimum" | "recommended" = "recommended"
): SpecCheckResult {
  const req: SpecRequirement = (tier === "recommended" && app.recommended) ? app.recommended : app.minimum;

  const primaryGpu = hw.gpus.find(g => !isLikelyIntegratedGpu(g)) ?? hw.gpus[0];

  const gpuJudgment: ComponentJudgment = primaryGpu
    ? judgeGpu(primaryGpu, req)
    : { level: "unknown", confidence: "low", reason: "GPU 정보를 가져올 수 없습니다" };

  const cpuJudgment: ComponentJudgment = hw.cpu
    ? judgeCpu(hw.cpu.name, hw.cpu.cores, hw.cpu.max_clock_mhz, req)
    : { level: "unknown", confidence: "low", reason: "CPU 정보를 가져올 수 없습니다" };

  const ramJudgment: ComponentJudgment = hw.ram
    ? judgeRam(hw.ram.total_gb, req)
    : { level: "unknown", confidence: "low", reason: "RAM 정보를 가져올 수 없습니다" };

  const storageJudgment: ComponentJudgment = hw.drives.length > 0
    ? judgeStorage(hw.drives, req)
    : { level: "unknown", confidence: "low", reason: "드라이브 정보를 가져올 수 없습니다" };

  const { overall, confidence } = deriveOverall([
    gpuJudgment, cpuJudgment, ramJudgment, storageJudgment,
  ]);

  return {
    app,
    tier,
    overall,
    confidence,
    components: {
      gpu: gpuJudgment,
      cpu: cpuJudgment,
      ram: ramJudgment,
      storage: storageJudgment,
    },
  };
}
