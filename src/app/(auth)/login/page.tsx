'use client'

import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { auth } from '@/firebase/firebase'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const usuariosPermitidos = [
    'adm@trailertiode.com',  // ADMIN
    'func@trailertiode.com'  // FUNCIONÁRIO
  ]

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
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

      // Define o perfil com base no e-mail
      const perfil = emailNormalizado === 'adm@trailertiode.com' ? 'ADM' : 'FUNC'

      // Salva no localStorage
      localStorage.setItem('perfil', perfil)

      // Grava um cookie para o middleware ler
      document.cookie = `perfil=${perfil}; path=/; max-age=${60 * 60}; SameSite=Lax`

      router.push('/dashboard')
    } catch {
      setErro('E-mail ou senha inválidos.')
    } finally {
      setCarregando(false)
    }
  }  // ← Aqui fechamos handleLogin corretamente

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={handleLogin}
        className="bg-white p-6 rounded-xl shadow-lg w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image
            src="/logo.png"
            alt="Trailer do Tio Dé"
            width={128}
            height={128}
            unoptimized
            className="w-32 h-32 sm:w-40 sm:h-40"
          />
        </div>

        <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>

        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full p-3 mb-4 border rounded focus:outline-none focus:ring"
          required
        />

        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={e => setSenha(e.target.value)}
          className="w-full p-3 mb-4 border rounded focus:outline-none focus:ring"
          required
        />

        {erro && (
          <p className="text-red-500 text-sm mb-4">{erro}</p>
        )}

        <button
          type="submit"
          disabled={carregando}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded transition mb-4"
        >
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>

        <p className="text-center text-sm text-gray-500">
          Esqueceu a senha? Entre em contato com o suporte.
        </p>
      </form>
    </div>
  )
}
