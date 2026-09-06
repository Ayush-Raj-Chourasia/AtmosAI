export type Language = 'en' | 'id';

export const translations = {
  en: {
    common: {
      loading: 'Loading...',
      error: 'An error occurred',
      retry: 'Sync Again',
      back: 'Back',
      save: 'Save',
      cancel: 'Cancel',
      submit: 'Submit',
      disasterTypes: {
        all: 'All',
        flood: 'Flood',
        earthquake: 'Earthquake',
        fire: 'Fire',
        landslide: 'Landslide',
        power_outage: 'Power Outage',
        volcano: 'Volcano',
        whirlwind: 'Whirlwind',
        tornado: 'Tornado',
        tsunami: 'Tsunami',
        other: 'Other'
      }
    },
    dashboard: {
      title: 'Disaster Pulse',
      status: {
        online: 'Online',
        offline: 'Offline Mode',
        syncing: 'Syncing data...',
        cached: 'Showing cached data from',
        uptodate: 'Up to date'
      },
      liveRadius: {
        title: 'Live Radius',
        expand: 'Expand Map'
      },
      recentAlerts: 'Recent Alerts',
      reportIncident: 'Report Incident',
      noActiveIncidents: 'No active incidents',
      immediateAreaQuiet: 'Your immediate area is quiet. Monitoring BMKG, News, Social Media, and Reports.',
      liveUpdates: 'LIVE UPDATES'
    },
    incidentFeed: {
        empty: 'No recent alerts nearby.',
        viewAll: 'View all',
        alert: 'Alert',
        unknownLocation: 'Unknown location',
        confidence: {
            high: 'High',
            medium: 'Medium',
            low: 'Low'
      },
      verifiedBy: 'Verified by',
      people: 'people'
    },
    report: {
      title: 'Report Incident',
      selectType: 'Select Type',
      description: 'Description',
      descriptionPlaceholder: 'Describe what you see...',
      location: {
        detecting: 'Detecting location...',
        detected: 'Location detected',
        unavailable: 'Unable to retrieve location',
        denied: 'Location permission denied',
        timeout: 'Location request timed out',
        required: 'Location is required to submit a report.'
      },
      media: {
        label: 'Photo/Video',
        // optional: 'optional', // Removed as it is now mandatory
        addPhoto: 'Add Photo/Video',
        invalidType: 'Please select an image or video file',
        imageTooLarge: 'Image must be less than 10MB',
        videoTooLarge: 'Video must be less than 50MB'
      },
      submit: 'Submit Report',
      submitting: 'Submitting...',
      success: 'Report submitted successfully! Thank you for your help.'
    },
    settings: {
      title: 'Settings',
      language: 'Language',
      selectLanguage: 'Select Language'
    },
    navigation: {
      home: 'Home',
      alerts: 'Alerts',
      map: 'Map',
      guides: 'Guides',
      profile: 'Profile'
    },
    map: {
      filter: {
        location: 'Location',
        allIndonesia: 'Indonesia',
        addZone: 'Add New Place'
      },
      addZone: {
        label: 'Label',
        placeholder: 'e.g. Home, Office, Parents',
        location: 'Location',
        useCurrentLocation: 'Use Current Location',
        orSearch: 'OR SEARCH / PICK ON MAP',
        change: 'Change',
        locationSelected: 'Location selected',
        saving: 'Saving...',
        submit: 'Add Place'
      }
    },
    alerts: {
      title: 'All Alerts',
      filter: {
        location: 'Location',
        type: 'Disaster Type',
        allLocations: 'All Locations',
        allTypes: 'All Types'
      },
      empty: 'No alerts found with current filters.',
      endOfList: 'End of list',
      loading: 'Loading alerts...'
    },
    guides: {
      title: 'Safety Guides',
      empty: 'No guides found for this category.',
      loading: 'Loading guides...'
    },
    profile: {
      title: 'Profile',
      memberSince: 'Member since',
      contributions: 'Your Contributions',
      reports: 'Reports',
      confirmed: 'Confirmed',
      hoax: 'Hoax',
      myPlaces: 'My Places',
      myPlacesDesc: 'Manage saved locations',
      notifications: 'Notifications',
      notificationsDesc: 'Alert preferences',
      notificationSettings: {
        pushTitle: 'Push Notifications',
        pushDesc: 'Receive real-time notifications when disasters occur in your area',
        notSupported: 'Browser does not support push notifications',
        notConfigured: 'Push notifications not configured yet',
        notConfiguredDesc: 'Developer needs to add Firebase configuration',
        blocked: 'Notifications blocked',
        blockedDesc: 'Please enable notifications in browser settings',
        active: 'Notifications Active',
        inactive: 'Notifications Inactive',
        activeDesc: 'You will receive disaster alerts',
        inactiveDesc: 'Click to enable notifications',
        enabled: 'Enabled',
        disabled: 'Disabled',
        monitoredLocations: 'Monitored Locations',
        monitoredLocationsDesc: 'Receive notifications for disasters in these locations',
        noLocations: 'No saved locations',
        addLocationHint: 'Add locations from the Map page to receive alerts',
        howItWorks: 'How Notifications Work',
        howItWorksList: [
          'You will receive alerts when new disasters are detected',
          'Notifications are sent based on your saved locations',
          'Make sure browser notification permission is enabled'
        ],
        toast: {
          enabled: 'Notifications Enabled',
          enabledDesc: 'You will receive disaster alerts in your area',
          disabled: 'Notifications Disabled',
          disabledDesc: 'You will not receive push notifications',
          error: 'Error',
          errorDesc: 'Failed to update notification settings'
        }
      },
      privacyPolicy: 'Privacy Policy',
      privacyPolicyDesc: 'Data sources & user rights',
      settingsDesc: 'App preferences',
      signOut: 'Sign Out'
    },
    incidentDetail: {
      notFound: 'Incident not found',
      confidence: 'Confidence',
      severity: 'Severity',
      reports: 'Reports',
      summary: 'Situation Summary',
      timeline: 'Incident Timeline',
      firstDetected: 'First Detected',
      currentStatus: 'Current Status',
      verification: {
        title: 'Is this real?',
        subtitle: 'Help us verify this incident by sharing your knowledge',
        confirm: 'Confirm',
        confirmed: 'Confirmed',
        falseAlarm: 'False Alarm',
        reportedFalse: 'Reported as False',
        communityStats: 'Community Verification'
      },
      sources: {
        userReports: 'User Reports',
        verifiedReports: 'verified reports',
        news: 'Latest News',
        readMore: 'Read more',
        liveUpdates: 'Live Updates'
      },
      safety: {
        title: 'Safety Measures',
        viewGuide: 'View Safety Guide',
        procedures: 'Procedures for'
      },
      emergency: {
        title: 'Emergency Contacts',
        call: 'Call'
      }
    }
  },
  id: {
    common: {
      loading: 'Memuat...',
      error: 'Terjadi kesalahan',
      retry: 'Sinkronisasi',
      back: 'Kembali',
      save: 'Simpan',
      cancel: 'Batal',
      submit: 'Kirim',
      disasterTypes: {
        all: 'Semua',
        flood: 'Banjir',
        earthquake: 'Gempa Bumi',
        fire: 'Kebakaran',
        landslide: 'Tanah Longsor',
        power_outage: 'Mati Listrik',
        volcano: 'Gunung Meletus',
        whirlwind: 'Angin Puting Beliung',
        tornado: 'Tornado',
        tsunami: 'Tsunami',
        other: 'Lainnya'
      }
    },
    dashboard: {
      title: 'Disaster Pulse',
      status: {
        online: 'Online',
        offline: 'Mode Offline',
        syncing: 'Menyinkronkan data...',
        cached: 'Menampilkan data cache dari',
        uptodate: 'Terbaru'
      },
      liveRadius: {
        title: 'Radius Langsung',
        expand: 'Buka Peta'
      },
      recentAlerts: 'Peringatan Terkini',
      reportIncident: 'Lapor Kejadian',
      noActiveIncidents: 'Tidak ada status aktif',
      immediateAreaQuiet: 'Area sekitar Anda aman. Memantau BMKG, Berita, Medsos, dan Laporan.',
      liveUpdates: 'UPDATE LANGSUNG'
    },
    incidentFeed: {
        empty: 'Tidak ada peringatan terkini di sekitar.',
        viewAll: 'Lihat semua',
        alert: 'Peringatan',
        unknownLocation: 'Lokasi tidak diketahui',
        confidence: {
            high: 'Tinggi',
            medium: 'Sedang',
            low: 'Rendah'
      },
      verifiedBy: 'Diverifikasi oleh',
      people: 'orang'
    },
    report: {
      title: 'Lapor Kejadian',
      selectType: 'Pilih Jenis',
      description: 'Deskripsi',
      descriptionPlaceholder: 'Jelaskan apa yang Anda lihat...',
      location: {
        detecting: 'Mendeteksi lokasi...',
        detected: 'Lokasi terdeteksi',
        unavailable: 'Tidak dapat mengambil lokasi',
        denied: 'Izin lokasi ditolak',
        timeout: 'Waktu permintaan lokasi habis',
        required: 'Lokasi diperlukan untuk mengirim laporan.'
      },
      media: {
        label: 'Foto/Video',
        optional: 'opsional',
        addPhoto: 'Tambah Foto/Video',
        invalidType: 'Pilih file gambar atau video',
        imageTooLarge: 'Ukuran gambar maksimal 10MB',
        videoTooLarge: 'Ukuran video maksimal 50MB'
      },
      submit: 'Kirim Laporan',
      submitting: 'Mengirim...',
      success: 'Laporan berhasil dikirim! Terima kasih atas bantuan Anda.'
    },
    settings: {
      title: 'Pengaturan',
      language: 'Bahasa',
      selectLanguage: 'Pilih Bahasa'
    },
    navigation: {
      home: 'Beranda',
      alerts: 'Peringatan',
      map: 'Peta',
      guides: 'Panduan',
      profile: 'Profil'
    },
    map: {
      filter: {
        location: 'Lokasi',
        allIndonesia: 'Semua Indonesia',
        addZone: 'Tambah Tempat Baru'
      },
      addZone: {
        label: 'Label',
        placeholder: 'misal: Rumah, Kantor, Orang Tua',
        location: 'Lokasi',
        useCurrentLocation: 'Gunakan Lokasi Saat Ini',
        orSearch: 'ATAU CARI / PILIH DI PETA',
        change: 'Ubah',
        locationSelected: 'Lokasi terpilih',
        saving: 'Menyimpan...',
        submit: 'Tambah Tempat'
      }
    },
    alerts: {
      title: 'Semua Peringatan',
      filter: {
        location: 'Lokasi',
        type: 'Jenis Bencana',
        allLocations: 'Semua Lokasi',
        allTypes: 'Semua Jenis'
      },
      empty: 'Tidak ada peringatan ditemukan dengan filter saat ini.',
      endOfList: 'Akhir daftar',
      loading: 'Memuat peringatan...'
    },
    guides: {
      title: 'Panduan Keselamatan',
      empty: 'Tidak ada panduan ditemukan untuk kategori ini.',
      loading: 'Memuat panduan...'
    },
    profile: {
      title: 'Profil',
      memberSince: 'Anggota sejak',
      contributions: 'Kontribusi Anda',
      reports: 'Laporan',
      confirmed: 'Terkonfirmasi',
      hoax: 'Hoax',
      myPlaces: 'Tempat Saya',
      myPlacesDesc: 'Kelola lokasi tersimpan',
      notifications: 'Notifikasi',
      notificationsDesc: 'Preferensi peringatan',
      notificationSettings: {
        pushTitle: 'Push Notifications',
        pushDesc: 'Terima notifikasi real-time saat terjadi bencana di area Anda',
        notSupported: 'Browser tidak mendukung notifikasi push',
        notConfigured: 'Push notifications belum dikonfigurasi',
        notConfiguredDesc: 'Developer perlu menambahkan konfigurasi Firebase',
        blocked: 'Notifikasi diblokir',
        blockedDesc: 'Mohon izinkan notifikasi di pengaturan browser',
        active: 'Notifikasi Aktif',
        inactive: 'Notifikasi Nonaktif',
        activeDesc: 'Anda akan menerima peringatan bencana',
        inactiveDesc: 'Klik untuk mengaktifkan notifikasi',
        enabled: 'Aktif',
        disabled: 'Nonaktif',
        monitoredLocations: 'Lokasi yang Dipantau',
        monitoredLocationsDesc: 'Terima notifikasi untuk bencana di lokasi-lokasi berikut',
        noLocations: 'Belum ada lokasi tersimpan',
        addLocationHint: 'Tambah lokasi dari halaman Peta untuk menerima peringatan',
        howItWorks: 'Cara Kerja Notifikasi',
        howItWorksList: [
          'Anda akan menerima peringatan saat ada bencana baru terdeteksi',
          'Notifikasi dikirim berdasarkan lokasi yang Anda simpan',
          'Pastikan izin notifikasi browser sudah diaktifkan'
        ],
        toast: {
          enabled: 'Notifikasi Aktif',
          enabledDesc: 'Anda akan menerima peringatan bencana di area Anda',
          disabled: 'Notifikasi Nonaktif',
          disabledDesc: 'Anda tidak akan menerima notifikasi push',
          error: 'Error',
          errorDesc: 'Gagal mengubah pengaturan notifikasi'
        }
      },
      privacyPolicy: 'Kebijakan Privasi',
      privacyPolicyDesc: 'Sumber data & hak pengguna',
      settingsDesc: 'Preferensi aplikasi',
      signOut: 'Keluar'
    },
    incidentDetail: {
      notFound: 'Insiden tidak ditemukan',
      confidence: 'Keyakinan',
      severity: 'Tingkat Keparahan',
      reports: 'Laporan',
      summary: 'Ringkasan Situasi',
      timeline: 'Linimasa Kejadian',
      firstDetected: 'Pertama Terdeteksi',
      currentStatus: 'Status Saat Ini',
      verification: {
        title: 'Apakah ini nyata?',
        subtitle: 'Bantu kami memverifikasi kejadian ini',
        confirm: 'Konfirmasi',
        confirmed: 'Terkonfirmasi',
        falseAlarm: 'Alarm Palsu',
        reportedFalse: 'Dilaporkan Palsu',
        communityStats: 'Verifikasi Komunitas'
      },
      sources: {
        userReports: 'Laporan Pengguna',
        verifiedReports: 'laporan terverifikasi',
        news: 'Berita Terkini',
        readMore: 'Baca selengkapnya',
        liveUpdates: 'Update Langsung'
      },
      safety: {
        title: 'Tindakan Pengamanan',
        viewGuide: 'Lihat Panduan',
        procedures: 'Prosedur untuk'
      },
      emergency: {
        title: 'Kontak Darurat',
        call: 'Panggil'
      }
    }
  }
};
