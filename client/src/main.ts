import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app.component';
import { isDevMode } from '@angular/core';

// Intercept and suppress specific Angular development logs without disabling HMR
if (isDevMode()) {
  const originalLog = console['log'] as (...args: any[]) => void;
  const originalWarn = console.warn;

  console['log'] = (...args: any[]) => {
    if (typeof args[0] === 'string' && (args[0].includes('Angular hydrated') || args[0].includes('Angular is running in development mode'))) return;
    originalLog(...args);
  };

  console.warn = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('NG0751')) return;
    originalWarn(...args);
  };
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
