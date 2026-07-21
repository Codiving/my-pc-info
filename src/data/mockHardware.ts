import type { HardwareInfo, LiveMetrics } from "../types/hardware";

// Mac 등 비(非) Tauri 환경에서 UI를 미리보기 위한 가짜 데이터.
// 개발 모드(import.meta.env.DEV)에서만 사용되며, 릴리즈 빌드에서는
// Vite 트리셰이킹으로 번들에서 완전히 제거된다. (useHardwareInfo 참고)

function jitter(base: number, spread: number, min = 0, max = 100): number {
  const v = base + (Math.random() * 2 - 1) * spread;
  return Math.round(Math.min(max, Math.max(min, v)));
}

type MockScenario = "balanced" | "upgrade";

// 개발 미리보기에서 두 상태를 오가며 볼 수 있게 URL 쿼리로 시나리오를 고른다.
//   ?mock=upgrade → 업그레이드가 필요한 PC / 그 외 → 균형 잡힌 PC(기본)
function mockScenario(): MockScenario {
  if (typeof window === "undefined") return "balanced";
  return new URLSearchParams(window.location.search).get("mock") === "upgrade"
    ? "upgrade"
    : "balanced";
}

export function getMockHardwareInfo(): HardwareInfo {
  const upgrade = mockScenario() === "upgrade";
  const cpuUsage = jitter(23, 12);

  // RAM: 균형(32GB DDR5, 슬롯 꽉참) vs 업그레이드 필요(8GB DDR4, 빈 슬롯 1개)
  const ramUsagePercent = jitter(upgrade ? 74 : 36, 8);
  const totalRam = upgrade ? 8 : 32;
  const usedGb = +(totalRam * (ramUsagePercent / 100)).toFixed(1);
  const ram = upgrade
    ? {
        total_gb: totalRam,
        available_gb: +(totalRam - usedGb).toFixed(1),
        used_gb: usedGb,
        usage_percent: ramUsagePercent,
        memory_type: "DDR4",
        speed_mhz: 3200,
        slots_used: 1,
        slots: [
          { slot: "DIMM 0", capacity_gb: 8, speed_mhz: 3200, memory_type: "DDR4", manufacturer: "Samsung" },
        ],
        total_slots: 2,
        max_capacity_gb: 32,
      }
    : {
        total_gb: totalRam,
        available_gb: +(totalRam - usedGb).toFixed(1),
        used_gb: usedGb,
        usage_percent: ramUsagePercent,
        memory_type: "DDR5",
        speed_mhz: 5600,
        slots_used: 2,
        slots: [
          { slot: "DIMM 0", capacity_gb: 16, speed_mhz: 5600, memory_type: "DDR5", manufacturer: "Samsung" },
          { slot: "DIMM 1", capacity_gb: 16, speed_mhz: 5600, memory_type: "DDR5", manufacturer: "Samsung" },
        ],
        total_slots: 2,
        max_capacity_gb: 64,
      };

  // 저장장치: 균형(넉넉한 NVMe 2개) vs 업그레이드 필요(부팅 SSD 여유 부족 + HDD 존재)
  const drives = upgrade
    ? [
        {
          letter: "C:",
          label: "Windows",
          total_gb: 512,
          free_gb: 34,
          used_percent: 93,
          drive_type: "SSD",
          model: "SK hynix BC711 512GB",
          interface_type: "NVMe",
          is_boot: true,
          file_system: "NTFS",
        },
        {
          letter: "D:",
          label: "Data",
          total_gb: 2000,
          free_gb: 820,
          used_percent: 59,
          drive_type: "HDD",
          model: "Seagate Barracuda 2TB",
          interface_type: "SATA",
          is_boot: false,
          file_system: "NTFS",
        },
      ]
    : [
        {
          letter: "C:",
          label: "Windows",
          total_gb: 1000,
          free_gb: 412,
          used_percent: 59,
          drive_type: "SSD",
          model: "Samsung SSD 990 PRO 1TB",
          interface_type: "NVMe",
          is_boot: true,
          file_system: "NTFS",
        },
        {
          letter: "D:",
          label: "Data",
          total_gb: 2000,
          free_gb: 1560,
          used_percent: 22,
          drive_type: "SSD",
          model: "WD Blue SN580 2TB",
          interface_type: "NVMe",
          is_boot: false,
          file_system: "NTFS",
        },
      ];

  return {
    cpu: {
      name: "AMD Ryzen 7 7840HS w/ Radeon 780M Graphics",
      manufacturer: "AuthenticAMD",
      cores: 8,
      threads: 16,
      base_clock_mhz: 3800,
      max_clock_mhz: 5100,
      usage_percent: cpuUsage,
      architecture: "x64",
      virtualization: true,
    },
    gpus: [
      {
        name: "NVIDIA GeForce RTX 4060 Laptop GPU",
        vram_gb: 8,
        manufacturer: "NVIDIA",
        driver_version: "552.22",
        resolution: "2560 x 1600",
        refresh_rate: 165,
        is_integrated: false,
      },
      {
        name: "AMD Radeon 780M",
        vram_gb: null,
        manufacturer: "AMD",
        driver_version: "31.0.14001.5006",
        resolution: "2560 x 1600",
        refresh_rate: 165,
        is_integrated: true,
      },
    ],
    ram,
    drives,
    motherboard: {
      manufacturer: "ASUSTeK COMPUTER INC.",
      model: "ROG Strix G16 (2024)",
      bios_version: "G614JV.312",
      bios_date: "2024-03-15",
    },
    os: {
      name: "Windows 11 Pro",
      version: "23H2",
      build: "22631.3593",
      architecture: "64비트",
      install_date: "2024-01-10",
      last_boot: "2026-07-19 08:30",
      uptime_hours: 29,
    },
    network: [
      {
        name: "Intel Wi-Fi 6E AX211 160MHz",
        connection_name: "Wi-Fi",
        is_connected: true,
        ip_address: "192.168.0.42",
        mac_address: "A4:B1:C2:D3:E4:F5",
        speed_mbps: 1200,
        adapter_type: "무선",
      },
      {
        name: "Realtek Gaming 2.5GbE Family Controller",
        connection_name: "이더넷",
        is_connected: false,
        ip_address: "",
        mac_address: "00:1A:2B:3C:4D:5E",
        speed_mbps: null,
        adapter_type: "유선",
      },
    ],
    battery: {
      charge_percent: jitter(78, 6),
      is_charging: true,
      health_percent: 94,
      design_capacity_mwh: 90000,
      full_capacity_mwh: 84600,
      estimated_minutes: 213,
    },
    is_laptop: true,
    computer_name: "ROG-STRIX-G16",
  };
}

// 실시간 모니터링 미리보기용 가짜 지표. 호출할 때마다 값이 자연스럽게 흔들린다.
export function getMockLiveMetrics(): LiveMetrics {
  const upgrade = mockScenario() === "upgrade";
  const totalRam = upgrade ? 8 : 32;
  const ramUsage = jitter(upgrade ? 76 : 38, 6);
  return {
    cpu_usage_percent: jitter(28, 22),
    cpu_clock_mhz: jitter(4200, 800, 2000, 5100),
    ram_usage_percent: ramUsage,
    ram_used_gb: +(totalRam * (ramUsage / 100)).toFixed(1),
    ram_total_gb: totalRam,
    cpu_temp_c: jitter(58, 12, 40, 92),
  };
}
