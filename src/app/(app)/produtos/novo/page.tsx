import { FormProduto } from '@/components/form-produto'
import { Cartao, Titulo } from '@/components/ui'

export const metadata = { title: 'Novo produto' }
export default function Novo() {
  return (<><Titulo>Novo produto</Titulo><Cartao><FormProduto /></Cartao></>)
}
