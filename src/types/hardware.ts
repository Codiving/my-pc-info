import type { AppKind } from "../utils/appKind";

export interface CpuInfo {
  name: string;
  manufacturer: string;
  cores: number;
  threads: number;
  base_clock_mhz: number;
  max_clock_mhz: number;
  usage_percent: number;
  architecture: string;
  virtualization: boolean;
}

export interface GpuInfo {
  name: string;
  vram_gb: number | null;
  manufacturer: string;
  driver_version: string;
  resolution: string;
  refresh_rate: number;
  is_integrated: boolean;
}

export interface RamSlotInfo {
  slot: string;
  capacity_gb: number;
  speed_mhz: number;
  memory_type: string;
  manufacturer: string;
}

export interface RamInfo {
  total_gb: number;
  available_gb: number;
  used_gb: number;
  usage_percent: number;
  memory_type: string;
  speed_mhz: number;
  slots_used: number;
  slots: RamSlotInfo[];
  total_slots: number;
  max_capacity_gb: number | null;
}

export interface LiveMetrics {
  cpu_usage_percent: number;
  cpu_clock_mhz: number;
  ram_usage_percent: number;
  ram_used_gb: number;
  ram_total_gb: number;
  cpu_temp_c: number | null;
}

export interface DriveInfo {
  letter: string;
  label: string;
  total_gb: number;
  free_gb: number;
  used_percent: number;
  drive_type: string;
  model: string;
  interface_type: string;
  is_boot: boolean;
  file_system: string;
}

export interface MotherboardInfo {
  manufacturer: string;
  model: string;
  bios_version: string;
  bios_date: string;
}

export interface OsInfo {
  name: string;
  version: string;
  build: string;
  architecture: string;
  install_date: string;
  last_boot: string;
  uptime_hours: number;
}

export interface NetworkInfo {
  name: string;
  connection_name: string;
  is_connected: boolean;
  ip_address: string;
  mac_address: string;
  speed_mbps: number | null;
  adapter_type: string;
}

export interface BatteryInfo {
  charge_percent: number;
  is_charging: boolean;
  health_percent: number | null;
  design_capacity_mwh: number | null;
  full_capacity_mwh: number | null;
  estimated_minutes: number | null;
}

// ─── Spec checker types ───────────────────────────────────────────────────────

export interface SpecRequirement {
  cpu?: string;
  cpu_cores?: number;
  cpu_clock_ghz?: number;
  gpu?: string;
  vram_gb?: number;
  allow_integrated_gpu?: boolean;
  ram_gb?: number;
  storage_gb?: number;
  notes?: string;
}

export interface AppRequirement {
  id: string;
  name: string;
  kind: AppKind;
  tags: string[];
  aliases?: string[];
  sourceName?: string;
  source?: string;
  minimum: SpecRequirement;
  recommended?: SpecRequirement;
}

export type JudgmentLevel = "met" | "borderline" | "unmet" | "unknown";
export type ConfidenceLevel = "high" | "medium" | "low";

export interface ComponentJudgment {
  level: JudgmentLevel;
  confidence: ConfidenceLevel;
  reason: string;
}

export interface SpecCheckResult {
  app: AppRequirement;
  tier: "minimum" | "recommended";
  overall: JudgmentLevel;
  confidence: ConfidenceLevel;
  components: {
    gpu: ComponentJudgment;
    cpu: ComponentJudgment;
    ram: ComponentJudgment;
    storage: ComponentJudgment;
  };
}

export interface HardwareInfo {
  cpu: CpuInfo | null;
  gpus: GpuInfo[];
  ram: RamInfo | null;
  drives: DriveInfo[];
  motherboard: MotherboardInfo | null;
  os: OsInfo | null;
  network: NetworkInfo[];
  battery: BatteryInfo | null;
  is_laptop: boolean;
  computer_name: string;
}
