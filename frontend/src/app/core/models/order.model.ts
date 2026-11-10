export const ORDER_STATUSES = ['CREATED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface Order {
  id: string;
  customerStore: string;
  originCountry: string;
  destinationCity: string;
  bouquetQuantity: number;
  status: OrderStatus;
  createdAt: string;
}

export interface StatusCount {
  status: OrderStatus;
  count: number;
}

export interface OrderStats {
  total: number;
  byStatus: StatusCount[];
}

export interface CreateOrderInput {
  customerStore: string;
  originCountry: string;
  destinationCity: string;
  bouquetQuantity: number;
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  CREATED: 'Creada',
  IN_TRANSIT: 'En tránsito',
  DELIVERED: 'Entregada',
  CANCELLED: 'Cancelada',
};

/** Espejo de las transiciones del backend; el backend sigue siendo la fuente de verdad. */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  CREATED: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && (ORDER_STATUSES as readonly string[]).includes(value);
}
