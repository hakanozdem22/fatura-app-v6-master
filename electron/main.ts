import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env in main process
dotenv.config();

let mainWindow: BrowserWindow | null = null;

// Configure auto-updater
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 900,
    minWidth: 1500,
    minHeight: 900,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f172a',
      symbolColor: '#94a3b8',
      height: 36
    },
    icon: path.join(__dirname, '../src/assets/logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Electron varsayılan menüsünü (File, Edit vb.) tamamen kaldır
  Menu.setApplicationMenu(null);

  // check if we're in dev mode
  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    // Packaged sürümde asar içindeki yolu daha sağlam bulmak için app.getAppPath() kullanıyoruz
    const indexPath = path.join(app.getAppPath(), 'dist/index.html');
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('FaturaApp: index.html yüklenemedi:', err);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Tam ekran yönetimi için IPC dinleyicisi
ipcMain.on('set-fullscreen', (_event, value: boolean) => {
  if (mainWindow) {
    mainWindow.setFullScreen(value);
    // Menü çubuğunu gizle/göster (isteğe bağlı, zaten gizli ama garantiye alalım)
    mainWindow.setMenuBarVisibility(!value);
  }
});



app.whenReady().then(() => {
  createWindow();

  // Package durumunda güncellemeleri kontrol et
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

// Auto-updater events
autoUpdater.on('checking-for-update', () => {
  mainWindow?.webContents.send('update-message', 'Güncellemeler kontrol ediliyor...');
});

autoUpdater.on('update-available', (info) => {
  mainWindow?.webContents.send('update-message', `Yeni sürüm mevcut: ${info.version}. İndiriliyor...`);
});

autoUpdater.on('update-not-available', () => {
  mainWindow?.webContents.send('update-message', 'Uygulama güncel.');
});

autoUpdater.on('error', (err) => {
  mainWindow?.webContents.send('update-message', `Güncelleme hatası: ${err.message}`);
});

autoUpdater.on('download-progress', (progressObj) => {
  mainWindow?.webContents.send('download-progress', progressObj);
});

autoUpdater.on('update-downloaded', () => {
  mainWindow?.webContents.send('update-message', 'Güncelleme indirildi. Yeniden başlatılıyor...');
  mainWindow?.webContents.send('update-downloaded');
  // Kısa bir bekleme sonrası kurulum için yeniden başlat
  setTimeout(() => {
    autoUpdater.quitAndInstall();
  }, 3000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
