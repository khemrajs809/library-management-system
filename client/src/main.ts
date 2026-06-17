import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app.component';
import { isDevMode } from '@angular/core';

// Intercept and suppress specific Angular development logs without disabling HMR
if (isDevMode()) {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  console.log = (...args: any[]) => {
    if (typeof args[0] === 'string' && (args[0].includes('Angular hydrated') || args[0].includes('Angular is running in development mode') || args[0].includes('NG0751'))) return;
    originalLog(...args);
  };

  console.warn = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('NG0751')) return;
    originalWarn(...args);
  };

  console.error = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('NG0751')) return;
    
    // Suppress benign View Transitions API "Transition was aborted" DOMException errors
    if (args[0] && args[0].name === 'InvalidStateError' && args[0].message?.includes('Transition was aborted')) return;
    if (typeof args[0] === 'string' && args[0].includes('Transition was aborted')) return;

    originalError(...args);
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.name === 'InvalidStateError' && event.reason.message?.includes('Transition was aborted')) {
      event.preventDefault();
    }
  });
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
