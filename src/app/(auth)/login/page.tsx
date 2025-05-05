'use client'

import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { auth } from '@/firebase/firebase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const usuariosPermitidos = ['adm@trailertiode.com', 'func@trailertiode.com']

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    const emailNormalizado = email.trim().toLowerCase()

    if (!usuariosPermitidos.includes(emailNormalizado)) {
      setErro('Usuário não autorizado.')
      setCarregando(false)
      return
    }

    try {
      await signInWithEmailAndPassword(auth, emailNormalizado, senha)

      // Salvar perfil
      if (emailNormalizado === 'adm@trailertiode.com') {
        localStorage.setItem('perfil', 'ADM')
      } else {
        localStorage.setItem('perfil', 'FUNC')
      }

      router.push('/dashboard')
    } catch {
      setErro('E-mail ou senha inválidos.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary px-4">
      <form
        onSubmit={handleLogin}
        className="bg-white p-6 rounded-xl shadow-lg w-full max-w-sm"
      >
        <h1 className="text-xl font-bold mb-4 text-center text-dark">Login</h1>

        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full p-2 mb-3 border rounded"
          required
        />
        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={e => setSenha(e.target.value)}
          className="w-full p-2 mb-3 border rounded"
          required
        />

        {erro && <p className="text-red-500 text-sm mb-2">{erro}</p>}

        <button
          type="submit"
          disabled={carregando}
          className="w-full bg-primary text-white p-2 rounded hover:opacity-90 transition"
        >
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>

        <p className="text-xs text-center text-gray-500 mt-4">
          Esqueceu a senha? Entre em contato com o suporte.
        </p>
      </form>
    </div>
  )
}
