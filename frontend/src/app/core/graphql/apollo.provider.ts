import { Provider, inject } from '@angular/core';
import { InMemoryCache } from '@apollo/client';
import { provideApollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';

/**
 * Cliente Apollo apuntando al Apollo Gateway.
 * `/graphql` lo resuelve el proxy de `ng serve` (proxy.conf.json) o nginx en Docker,
 * así el navegador siempre habla con su mismo origen y no hay CORS que configurar.
 */
export function provideGraphQL(uri = '/graphql'): Provider {
  return provideApollo(() => ({
    link: inject(HttpLink).create({ uri }),
    cache: new InMemoryCache(),
  }));
}
