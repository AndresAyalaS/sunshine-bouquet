import { gql } from 'apollo-angular';

const ORDER_FIELDS = gql`
  fragment OrderFields on Order {
    id
    customerStore
    originCountry
    destinationCity
    bouquetQuantity
    status
    createdAt
  }
`;

export const ORDERS_QUERY = gql`
  query Orders($status: OrderStatus) {
    orders(status: $status) {
      ...OrderFields
    }
  }
  ${ORDER_FIELDS}
`;

export const ORDER_QUERY = gql`
  query Order($id: UUID!) {
    order(id: $id) {
      ...OrderFields
    }
  }
  ${ORDER_FIELDS}
`;

export const ORDER_STATS_QUERY = gql`
  query OrderStats {
    orderStats {
      total
      byStatus {
        status
        count
      }
    }
  }
`;

export const CREATE_ORDER_MUTATION = gql`
  mutation CreateOrder($input: CreateOrderInput!) {
    createOrder(input: $input) {
      ...OrderFields
    }
  }
  ${ORDER_FIELDS}
`;

export const UPDATE_ORDER_STATUS_MUTATION = gql`
  mutation UpdateOrderStatus($id: UUID!, $status: OrderStatus!) {
    updateOrderStatus(id: $id, status: $status) {
      ...OrderFields
    }
  }
  ${ORDER_FIELDS}
`;

export const ASSIGN_ORDER_TO_STORE_MUTATION = gql`
  mutation AssignOrderToStore($id: UUID!, $customerStore: String!) {
    assignOrderToStore(id: $id, customerStore: $customerStore) {
      ...OrderFields
    }
  }
  ${ORDER_FIELDS}
`;
