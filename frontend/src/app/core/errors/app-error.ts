import { CombinedGraphQLErrors } from '@apollo/client/errors';

/** Error de aplicación ya traducido a algo mostrable al usuario. */
export class AppError extends Error {
  constructor(
    message: string,
    /** Código estable del backend (p. ej. INVALID_STATUS_TRANSITION), si existe. */
    readonly code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

const NETWORK_MESSAGE =
  'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución e inténtalo de nuevo.';

/** Convierte cualquier error (GraphQL, red, desconocido) en un AppError legible. */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (CombinedGraphQLErrors.is(error)) {
    const first = error.errors[0];
    const code = first?.extensions?.['code'];
    return new AppError(first?.message ?? 'El servidor devolvió un error.', typeof code === 'string' ? code : undefined);
  }

  // Los errores de red / HTTP (ServerError, fallos de fetch) no traen mensajes útiles para el usuario.
  return new AppError(NETWORK_MESSAGE);
}

/** Texto para mostrar. Acepta también los errores envueltos que expone `resource()` (`cause`). */
export function errorText(error: unknown): string {
  const inner = error instanceof Error && error.cause ? error.cause : error;
  return toAppError(inner).message;
}
