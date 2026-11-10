import { Routes } from '@angular/router';

export const ORDERS_ROUTES: Routes = [
  {
    path: '',
    title: 'Órdenes',
    loadComponent: () => import('./order-list.page').then((m) => m.OrderListPage),
  },
  {
    path: 'new',
    title: 'Nueva orden',
    loadComponent: () => import('./order-form.page').then((m) => m.OrderFormPage),
  },
  {
    path: ':id',
    title: 'Detalle de orden',
    loadComponent: () => import('./order-detail.page').then((m) => m.OrderDetailPage),
  },
];
