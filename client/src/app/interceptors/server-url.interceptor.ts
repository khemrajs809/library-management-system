import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';

export const serverUrlInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  
  if (isPlatformServer(platformId) && req.url.startsWith('/api')) {
    // During Server-Side Rendering (SSR), relative URLs fail.
    // We must prepend the absolute backend URL.
    const serverReq = req.clone({
      url: `https://localhost:5005${req.url}`
    });
    return next(serverReq);
  }
  
  return next(req);
};
