// src/lib/auth.ts

export type Perfil = 'ADM' | 'FUNC'

/**
 * Retorna o perfil do usuário salvo no localStorage.
 * Se for SSR (window indefinido) ou não houver nada salvo, retorna 'FUNC' por padrão.
 */
export function getUserPerfil(): Perfil {
  if (typeof window === 'undefined') {
    return 'FUNC'
  }
  return (localStorage.getItem('perfil') as Perfil) || 'FUNC'
}

/**
 * Salva o perfil do usuário no localStorage usando a chave 'perfil'.
 */
export function setUserPerfil(type: Perfil) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('perfil', type)
  }
}
