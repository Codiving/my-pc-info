use serde::{Deserialize, Serialize};

// ─── Public structs ───────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct CpuInfo {
    pub name: String,
    pub manufacturer: String,
    pub cores: u32,
    pub threads: u32,
    pub base_clock_mhz: u32,
    pub max_clock_mhz: u32,
    pub usage_percent: u32,
    pub architecture: String,
    pub virtualization: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct GpuInfo {
    pub name: String,
    pub vram_gb: Option<f64>,
    pub manufacturer: String,
    pub driver_version: String,
    pub resolution: String,
    pub refresh_rate: u32,
    pub is_integrated: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct RamSlotInfo {
    pub slot: String,
    pub capacity_gb: f64,
    pub speed_mhz: u32,
    pub memory_type: String,
    pub manufacturer: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct RamInfo {
    pub total_gb: f64,
    pub available_gb: f64,
    pub used_gb: f64,
    pub usage_percent: u32,
    pub memory_type: String,
    pub speed_mhz: u32,
    pub slots_used: u32,
    pub slots: Vec<RamSlotInfo>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct DriveInfo {
    pub letter: String,
    pub label: String,
    pub total_gb: f64,
    pub free_gb: f64,
    pub used_percent: u32,
    pub drive_type: String,
    pub model: String,
    pub interface_type: String,
    pub is_boot: bool,
    pub file_system: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct MotherboardInfo {
    pub manufacturer: String,
    pub model: String,
    pub bios_version: String,
    pub bios_date: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct OsInfo {
    pub name: String,
    pub version: String,
    pub build: String,
    pub architecture: String,
    pub install_date: String,
    pub last_boot: String,
    pub uptime_hours: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct NetworkInfo {
    pub name: String,
    pub connection_name: String,
    pub is_connected: bool,
    pub ip_address: String,
    pub mac_address: String,
    pub speed_mbps: Option<u64>,
    pub adapter_type: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct BatteryInfo {
    pub charge_percent: u32,
    pub is_charging: bool,
    pub health_percent: Option<u32>,
    pub design_capacity_mwh: Option<u32>,
    pub full_capacity_mwh: Option<u32>,
    pub estimated_minutes: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct HardwareInfo {
    pub cpu: Option<CpuInfo>,
    pub gpus: Vec<GpuInfo>,
    pub ram: Option<RamInfo>,
    pub drives: Vec<DriveInfo>,
    pub motherboard: Option<MotherboardInfo>,
    pub os: Option<OsInfo>,
    pub network: Vec<NetworkInfo>,
    pub battery: Option<BatteryInfo>,
    pub is_laptop: bool,
    pub computer_name: String,
}

// ─── Windows implementation ───────────────────────────────────────────────────

#[cfg(target_os = "windows")]
mod platform {
    use super::*;
    use std::collections::HashMap;
    use wmi::{COMLibrary, WMIConnection};

    #[allow(non_snake_case)]
    #[derive(serde::Deserialize, Debug)]
    struct Win32Processor {
        Name: Option<String>,
        Manufacturer: Option<String>,
        NumberOfCores: Option<u32>,
        NumberOfLogicalProcessors: Option<u32>,
        MaxClockSpeed: Option<u32>,
        CurrentClockSpeed: Option<u32>,
        LoadPercentage: Option<u32>,
        Architecture: Option<u32>,
        VirtualizationFirmwareEnabled: Option<bool>,
    }

    #[allow(non_snake_case)]
    #[derive(serde::Deserialize, Debug)]
    struct Win32VideoController {
        Name: Option<String>,
        AdapterRAM: Option<u64>,
        DriverVersion: Option<String>,
        CurrentHorizontalResolution: Option<u32>,
        CurrentVerticalResolution: Option<u32>,
        CurrentRefreshRate: Option<u32>,
        AdapterCompatibility: Option<String>,
    }

    #[allow(non_snake_case)]
    #[derive(serde::Deserialize, Debug)]
    struct Win32PhysicalMemory {
        Capacity: Option<u64>,
        Speed: Option<u32>,
        SMBIOSMemoryType: Option<u32>,
        DeviceLocator: Option<String>,
        Manufacturer: Option<String>,
    }

    #[allow(non_snake_case)]
    #[derive(serde::Deserialize, Debug)]
    struct Win32OperatingSystem {
        Caption: Option<String>,
        Version: Option<String>,
        BuildNumber: Option<String>,
        OSArchitecture: Option<String>,
        TotalVisibleMemorySize: Option<u64>,
        FreePhysicalMemory: Option<u64>,
        InstallDate: Option<String>,
        LastBootUpTime: Option<String>,
    }

    #[allow(non_snake_case)]
    #[derive(serde::Deserialize, Debug)]
    struct Win32ComputerSystem {
        Name: Option<String>,
        Manufacturer: Option<String>,
        Model: Option<String>,
        PCSystemType: Option<u32>,
    }

    #[allow(non_snake_case)]
    #[derive(serde::Deserialize, Debug)]
    struct Win32LogicalDisk {
        DeviceID: Option<String>,
        VolumeName: Option<String>,
        Size: Option<u64>,
        FreeSpace: Option<u64>,
        DriveType: Option<u32>,
        FileSystem: Option<String>,
    }

    #[allow(non_snake_case)]
    #[derive(serde::Deserialize, Debug)]
    struct Win32DiskDrive {
        Model: Option<String>,
        InterfaceType: Option<String>,
        MediaType: Option<String>,
        Index: Option<u32>,
    }

    #[allow(non_snake_case)]
    #[derive(serde::Deserialize, Debug)]
    struct Win32BaseBoard {
        Manufacturer: Option<String>,
        Product: Option<String>,
    }

    #[allow(non_snake_case)]
    #[derive(serde::Deserialize, Debug)]
    struct Win32BIOS {
        SMBIOSBIOSVersion: Option<String>,
        ReleaseDate: Option<String>,
    }

    #[allow(non_snake_case)]
    #[derive(serde::Deserialize, Debug)]
    struct Win32NetworkAdapter {
        Name: Option<String>,
        NetConnectionStatus: Option<u16>,
        MACAddress: Option<String>,
        Speed: Option<u64>,
        NetConnectionID: Option<String>,
        AdapterTypeId: Option<u32>,
        PhysicalAdapter: Option<bool>,
    }

    #[allow(non_snake_case)]
    #[derive(serde::Deserialize, Debug)]
    struct Win32NetworkAdapterConfiguration {
        IPAddress: Option<Vec<String>>,
        MACAddress: Option<String>,
        IPEnabled: Option<bool>,
    }

    #[allow(non_snake_case)]
    #[derive(serde::Deserialize, Debug)]
    struct Win32Battery {
        EstimatedChargeRemaining: Option<u32>,
        BatteryStatus: Option<u32>,
        DesignCapacity: Option<u32>,
        FullChargeCapacity: Option<u32>,
        EstimatedRunTime: Option<u32>,
    }

    fn memory_type_name(code: u32) -> &'static str {
        match code {
            20 => "DDR", 21 => "DDR2", 24 => "DDR3", 26 => "DDR4", 34 => "DDR5", _ => "Unknown",
        }
    }

    fn detect_gpu_manufacturer(name: &str, compat: Option<&str>) -> String {
        let n = name.to_lowercase();
        let c = compat.unwrap_or("").to_lowercase();
        if n.contains("nvidia") || c.contains("nvidia") { "NVIDIA".into() }
        else if n.contains("amd") || n.contains("radeon") || c.contains("amd") { "AMD".into() }
        else if n.contains("intel") || c.contains("intel") { "Intel".into() }
        else { "Unknown".into() }
    }

    fn detect_integrated_gpu(name: &str, manufacturer: &str) -> bool {
        let n = name.to_lowercase();
        let m = manufacturer.to_lowercase();

        if m == "intel" {
            return !n.contains("arc");
        }

        if m == "amd" {
            return n.contains("vega")
                || n.contains("radeon graphics")
                || n.contains("radeon(tm) graphics")
                || n.contains("integrated graphics")
                || n.contains("apu")
                || n.contains("graphics");
        }

        false
    }

    fn detect_disk_type(model: &str, interface: &str, media: &str) -> String {
        let m = model.to_uppercase();
        let i = interface.to_uppercase();
        if m.contains("NVME") || m.contains("NVM") || i.contains("NVM") {
            "NVMe SSD".into()
        } else if m.contains("SSD") || m.contains("SOLID STATE") {
            "SATA SSD".into()
        } else if i.contains("USB") || m.contains("USB") {
            "USB".into()
        } else if media.to_uppercase().contains("REMOVABLE") {
            "이동식".into()
        } else {
            "HDD".into()
        }
    }

    fn format_wmi_date(dt: &str) -> String {
        if dt.len() < 14 { return dt.to_string(); }
        let y = &dt[0..4]; let mo = &dt[4..6]; let d = &dt[6..8];
        let h = &dt[8..10]; let mi = &dt[10..12];
        format!("{y}-{mo}-{d} {h}:{mi}")
    }

    #[cfg(target_os = "windows")]
    fn get_uptime_hours() -> u64 {
        #[link(name = "kernel32")]
        extern "system" { fn GetTickCount64() -> u64; }
        unsafe { GetTickCount64() / 3_600_000 }
    }

    pub fn get_hardware_info() -> Result<HardwareInfo, String> {
        let com_con = COMLibrary::new().map_err(|e| format!("COM 초기화 실패: {e}"))?;
        let wmi_con = WMIConnection::new(com_con).map_err(|e| format!("WMI 연결 실패: {e}"))?;

        // ── CPU ────────────────────────────────────────────────────────────────
        let cpu = wmi_con.query::<Win32Processor>().ok()
            .and_then(|v| v.into_iter().next())
            .and_then(|p| {
                let name = p.Name.as_deref()?.trim().to_string();
                Some(CpuInfo {
                    name,
                    manufacturer: p.Manufacturer.unwrap_or_default().trim().to_string(),
                    cores: p.NumberOfCores.unwrap_or(0),
                    threads: p.NumberOfLogicalProcessors.unwrap_or(0),
                    base_clock_mhz: p.CurrentClockSpeed.unwrap_or(0),
                    max_clock_mhz: p.MaxClockSpeed.unwrap_or(0),
                    usage_percent: p.LoadPercentage.unwrap_or(0),
                    architecture: if p.Architecture == Some(9) { "x64".into() } else { "x86".into() },
                    virtualization: p.VirtualizationFirmwareEnabled.unwrap_or(false),
                })
            });

        // ── GPU ────────────────────────────────────────────────────────────────
        let gpus = wmi_con.query::<Win32VideoController>().unwrap_or_default()
            .into_iter()
            .filter_map(|g| {
                let name = g.Name.as_deref()?.trim().to_string();
                let vram_gb = g.AdapterRAM.filter(|&v| v > 512 * 1024 * 1024)
                    .map(|v| (v as f64 / (1u64 << 30) as f64 * 10.0).round() / 10.0);
                let mfr = detect_gpu_manufacturer(&name, g.AdapterCompatibility.as_deref());
                let is_integrated = detect_integrated_gpu(&name, &mfr);
                let resolution = match (g.CurrentHorizontalResolution, g.CurrentVerticalResolution) {
                    (Some(w), Some(h)) if w > 0 => format!("{w}×{h}"),
                    _ => String::new(),
                };
                Some(GpuInfo {
                    manufacturer: mfr,
                    name,
                    vram_gb,
                    driver_version: g.DriverVersion.unwrap_or_default().trim().to_string(),
                    resolution,
                    refresh_rate: g.CurrentRefreshRate.unwrap_or(0),
                    is_integrated,
                })
            })
            .collect();

        // ── RAM ────────────────────────────────────────────────────────────────
        let ram_modules: Vec<Win32PhysicalMemory> = wmi_con.query().unwrap_or_default();
        let os_entries: Vec<Win32OperatingSystem> = wmi_con.query().unwrap_or_default();
        let os_entry = os_entries.into_iter().next();

        let ram = if ram_modules.is_empty() { None } else {
            let total_kb = os_entry.as_ref().and_then(|o| o.TotalVisibleMemorySize).unwrap_or(0);
            let free_kb  = os_entry.as_ref().and_then(|o| o.FreePhysicalMemory).unwrap_or(0);
            let total_gb = total_kb as f64 / (1024.0 * 1024.0);
            let available_gb = free_kb as f64 / (1024.0 * 1024.0);
            let used_gb = total_gb - available_gb;
            let usage_percent = if total_kb > 0 { ((total_kb - free_kb) * 100 / total_kb) as u32 } else { 0 };
            let speed_mhz = ram_modules.first().and_then(|m| m.Speed).unwrap_or(0);
            let mem_type = memory_type_name(
                ram_modules.first().and_then(|m| m.SMBIOSMemoryType).unwrap_or(0)
            ).to_string();
            let slots_used = ram_modules.len() as u32;
            let slots = ram_modules.iter().map(|m| RamSlotInfo {
                slot: m.DeviceLocator.as_deref().unwrap_or("Unknown").trim().to_string(),
                capacity_gb: m.Capacity.unwrap_or(0) as f64 / (1u64 << 30) as f64,
                speed_mhz: m.Speed.unwrap_or(0),
                memory_type: memory_type_name(m.SMBIOSMemoryType.unwrap_or(0)).to_string(),
                manufacturer: m.Manufacturer.as_deref().unwrap_or("Unknown").trim()
                    .replace('\u{0}', "").to_string(),
            }).collect();
            Some(RamInfo { total_gb, available_gb, used_gb, usage_percent, memory_type: mem_type, speed_mhz, slots_used, slots })
        };

        // ── OS ─────────────────────────────────────────────────────────────────
        let os = os_entry.map(|o| OsInfo {
            name: o.Caption.unwrap_or_default().trim().to_string(),
            version: o.Version.unwrap_or_default(),
            build: o.BuildNumber.unwrap_or_default(),
            architecture: o.OSArchitecture.unwrap_or_else(|| "64비트".into()),
            install_date: o.InstallDate.as_deref().map(format_wmi_date).unwrap_or_default(),
            last_boot: o.LastBootUpTime.as_deref().map(format_wmi_date).unwrap_or_default(),
            uptime_hours: get_uptime_hours(),
        });

        // ── Computer System ────────────────────────────────────────────────────
        let cs: Vec<Win32ComputerSystem> = wmi_con.query().unwrap_or_default();
        let cs_entry = cs.into_iter().next();
        let computer_name = cs_entry.as_ref().and_then(|c| c.Name.clone()).unwrap_or_default();
        let is_laptop = cs_entry.as_ref().and_then(|c| c.PCSystemType) == Some(2);

        // ── Storage ────────────────────────────────────────────────────────────
        let phys_disks: Vec<Win32DiskDrive> = wmi_con.query().unwrap_or_default();
        let logical_disks: Vec<Win32LogicalDisk> = wmi_con.query().unwrap_or_default();

        // Build disk index → type map from physical disks
        let disk_type_map: Vec<String> = phys_disks.iter().map(|d| {
            detect_disk_type(
                d.Model.as_deref().unwrap_or(""),
                d.InterfaceType.as_deref().unwrap_or(""),
                d.MediaType.as_deref().unwrap_or(""),
            )
        }).collect();
        let disk_model_map: Vec<String> = phys_disks.iter()
            .map(|d| d.Model.as_deref().unwrap_or("Unknown").trim().to_string())
            .collect();
        let default_type = disk_type_map.first().cloned().unwrap_or_else(|| "알 수 없음".into());
        let default_model = disk_model_map.first().cloned().unwrap_or_default();

        let drives: Vec<DriveInfo> = logical_disks.into_iter()
            .filter(|d| d.DriveType == Some(3))
            .filter_map(|d| {
                let letter = d.DeviceID?;
                let total = d.Size.unwrap_or(0);
                let free  = d.FreeSpace.unwrap_or(0);
                let total_gb = total as f64 / (1u64 << 30) as f64;
                let free_gb  = free  as f64 / (1u64 << 30) as f64;
                let used_pct = if total > 0 { ((total - free) * 100 / total) as u32 } else { 0 };
                let is_boot = letter.to_uppercase() == "C:";
                Some(DriveInfo {
                    letter,
                    label: d.VolumeName.unwrap_or_default().trim().to_string(),
                    total_gb, free_gb, used_percent: used_pct,
                    drive_type: default_type.clone(),
                    model: default_model.clone(),
                    interface_type: phys_disks.first()
                        .and_then(|p| p.InterfaceType.as_deref().map(str::to_string))
                        .unwrap_or_default(),
                    is_boot,
                    file_system: d.FileSystem.unwrap_or_default(),
                })
            })
            .collect();

        // ── Motherboard / BIOS ─────────────────────────────────────────────────
        let boards: Vec<Win32BaseBoard> = wmi_con.query().unwrap_or_default();
        let bioses: Vec<Win32BIOS>      = wmi_con.query().unwrap_or_default();
        let motherboard = boards.into_iter().next().map(|b| {
            let bios = bioses.into_iter().next();
            MotherboardInfo {
                manufacturer: b.Manufacturer.unwrap_or_default().trim().to_string(),
                model: b.Product.unwrap_or_default().trim().to_string(),
                bios_version: bios.as_ref().and_then(|x| x.SMBIOSBIOSVersion.as_deref().map(str::to_string)).unwrap_or_default(),
                bios_date: bios.as_ref().and_then(|x| x.ReleaseDate.as_deref().map(format_wmi_date)).unwrap_or_default(),
            }
        });

        // ── Network ────────────────────────────────────────────────────────────
        let adapters: Vec<Win32NetworkAdapter> = wmi_con.query().unwrap_or_default();
        let configs:  Vec<Win32NetworkAdapterConfiguration> = wmi_con.query().unwrap_or_default();

        let mut ip_by_mac: HashMap<String, String> = HashMap::new();
        for cfg in &configs {
            if cfg.IPEnabled == Some(true) {
                if let (Some(mac), Some(ips)) = (&cfg.MACAddress, &cfg.IPAddress) {
                    if let Some(ipv4) = ips.iter().find(|ip| !ip.contains(':')) {
                        ip_by_mac.insert(mac.clone(), ipv4.clone());
                    }
                }
            }
        }

        let network: Vec<NetworkInfo> = adapters.into_iter()
            .filter(|a| a.PhysicalAdapter == Some(true) && a.NetConnectionStatus.is_some())
            .filter_map(|a| {
                let name = a.Name.as_deref()?.to_string();
                let mac  = a.MACAddress.clone().unwrap_or_default();
                let is_connected = a.NetConnectionStatus == Some(2);
                let ip = ip_by_mac.get(&mac).cloned().unwrap_or_default();
                let speed_mbps = a.Speed.filter(|&s| s > 0).map(|s| s / 1_000_000);
                let adapter_type = if a.AdapterTypeId == Some(9) { "Wi-Fi".into() } else { "이더넷".into() };
                Some(NetworkInfo {
                    name,
                    connection_name: a.NetConnectionID.unwrap_or_default(),
                    is_connected,
                    ip_address: ip,
                    mac_address: mac,
                    speed_mbps,
                    adapter_type,
                })
            })
            .collect();

        // ── Battery ────────────────────────────────────────────────────────────
        let batteries: Vec<Win32Battery> = wmi_con.query().unwrap_or_default();
        let battery = batteries.into_iter().next().map(|b| {
            let health = match (b.DesignCapacity, b.FullChargeCapacity) {
                (Some(d), Some(f)) if d > 0 => Some((f * 100 / d) as u32),
                _ => None,
            };
            BatteryInfo {
                charge_percent: b.EstimatedChargeRemaining.unwrap_or(0),
                is_charging: b.BatteryStatus == Some(2),
                health_percent: health,
                design_capacity_mwh: b.DesignCapacity,
                full_capacity_mwh: b.FullChargeCapacity,
                estimated_minutes: b.EstimatedRunTime.filter(|&m| m < 71582788), // filter bogus value
            }
        });

        Ok(HardwareInfo { cpu, gpus, ram, drives, motherboard, os, network, battery, is_laptop, computer_name })
    }
}

// ─── Non-Windows stub ────────────────────────────────────────────────────────

#[cfg(not(target_os = "windows"))]
mod platform {
    use super::*;

    pub fn get_hardware_info() -> Result<HardwareInfo, String> {
        Err("WINDOWS_ONLY".into())
    }
}

// ─── Tauri command ────────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_hardware_info() -> Result<HardwareInfo, String> {
    // Tauri's main thread initializes COM with COINIT_APARTMENTTHREADED (WebView2).
    // wmi crate calls CoInitializeEx(COINIT_MULTITHREADED), causing 0x80010106
    // (RPC_E_CHANGED_MODE) if called on the same thread. A fresh OS thread avoids this.
    std::thread::spawn(|| platform::get_hardware_info())
        .join()
        .map_err(|_| "스레드 오류".to_string())?
}

#[tauri::command]
pub fn open_external_url(url: String) -> Result<(), String> {
    if !(url.starts_with("http://") || url.starts_with("https://")) {
        return Err("지원하지 않는 URL 형식입니다".into());
    }

    webbrowser::open(&url).map_err(|err| err.to_string())
}
