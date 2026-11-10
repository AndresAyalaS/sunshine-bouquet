import { provideHttpClient, withFetch } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideGraphQL } from './core/graphql/apollo.provider';
import { routes } from './app.routes';

registerLocaleData(localeEs);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // withComponentInputBinding: params de ruta y query params llegan como inputs de los componentes.
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch()),
    provideGraphQL('/graphql'),
    { provide: LOCALE_ID, useValue: 'es' },
  ],
};
