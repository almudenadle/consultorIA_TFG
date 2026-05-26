import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {
  withInterceptorsFromDi,
  HTTP_INTERCEPTORS,
  withFetch,
  provideHttpClient,
} from '@angular/common/http';

import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';
import Aura from '@primeng/themes/aura';
import { definePreset, palette } from '@primeng/themes';

import { routes } from './app.routes';
import { AuthInterceptor } from './interceptors/auth.interceptor';

// Change Aura theme settings to use another colors
const MyCustomPreset = definePreset(Aura, {
  semantic: {
    // Map primary to built-in Violet palette
    primary: {
      50: '{violet.50}',
      100: '{violet.100}',
      200: '{violet.200}',
      300: '{violet.300}',
      400: '{violet.400}',
      500: '{violet.500}',
      600: '{violet.600}',
      700: '{violet.700}',
      800: '{violet.800}',
      900: '{violet.900}',
      950: '{violet.950}',
    },
    // Adjust colors for better contrast (White text on buttons)
    colorScheme: {
      light: {
        primary: {
          color: '{violet.600}',
          contrastColor: '#ffffff',
          hoverColor: '{violet.700}',
          activeColor: '{violet.800}',
        },
      },
      dark: {
        primary: {
          color: '{violet.400}',
          contrastColor: '{surface.900}',
          hoverColor: '{violet.300}',
          activeColor: '{violet.200}',
        },
      },
    },
  },
  extend: {
    sec1: palette('#6C4A97'),
    sec2: palette('#456E8F'),
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
    // Enable HTPP interceptors
    provideHttpClient(withInterceptorsFromDi(), withFetch()),
    // multi: true --> Enable use multiple interceptors
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    // PrimeNG MessageService for Toast
    MessageService,

    // Apply custom preset
    providePrimeNG({
      theme: {
        preset: MyCustomPreset,
        options: {
          cssLayer: {
            name: 'primeng',
            order: 'tailwind-base, primeng, tailwind-utilities',
          },
        },
      },
    }),
  ],
};
