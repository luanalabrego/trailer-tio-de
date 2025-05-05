export function getUserType(): 'adm' | 'funcionario' {
    if (typeof window === 'undefined') return 'funcionario' // fallback para SSR
    return (localStorage.getItem('userType') as 'adm' | 'funcionario') || 'funcionario'
  }
  
  export function setUserType(type: 'adm' | 'funcionario') {
    if (typeof window !== 'undefined') {
      localStorage.setItem('userType', type)
    }
  }
  