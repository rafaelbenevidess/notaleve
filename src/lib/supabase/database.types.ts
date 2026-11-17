
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "assinaturas": {
                  Row: {
                    "asaas_customer_id": string | null,"asaas_subscription_id": string | null,"atualizado_em": string,"empresa_id": string,"plano": string,"proximo_vencimento": string | null,"status": string,"trial_ate": string,"valor": number
                  }
                  ComputedFields: never
                  Insert: {
                    "asaas_customer_id"?: string | null,"asaas_subscription_id"?: string | null,"atualizado_em"?: string,"empresa_id": string,"plano"?: string,"proximo_vencimento"?: string | null,"status"?: string,"trial_ate"?: string,"valor"?: number
                  }
                  Update: {
                    "asaas_customer_id"?: string | null,"asaas_subscription_id"?: string | null,"atualizado_em"?: string,"empresa_id"?: string,"plano"?: string,"proximo_vencimento"?: string | null,"status"?: string,"trial_ate"?: string,"valor"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "assinaturas_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: true
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                },"auditoria": {
                  Row: {
                    "acao": string,"criado_em": string,"detalhe": Json | null,"empresa_id": string | null,"id": number,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "acao": string,"criado_em"?: string,"detalhe"?: Json | null,"empresa_id"?: string | null,"id"?: never,"user_id"?: string | null
                  }
                  Update: {
                    "acao"?: string,"criado_em"?: string,"detalhe"?: Json | null,"empresa_id"?: string | null,"id"?: never,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "auditoria_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                },"calculos": {
                  Row: {
                    "carga_efetiva_pct": number,"criado_em": string,"empresa_id": string,"id": string,"modo": string,"motor": string,"request": Json | null,"response": Json | null,"resultado": NonNullable<Json>,"total_tributos": number,"venda_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "carga_efetiva_pct": number,"criado_em"?: string,"empresa_id": string,"id"?: string,"modo": string,"motor": string,"request"?: Json | null,"response"?: Json | null,"resultado": NonNullable<Json>,"total_tributos": number,"venda_id": string
                  }
                  Update: {
                    "carga_efetiva_pct"?: number,"criado_em"?: string,"empresa_id"?: string,"id"?: string,"modo"?: string,"motor"?: string,"request"?: Json | null,"response"?: Json | null,"resultado"?: NonNullable<Json>,"total_tributos"?: number,"venda_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "calculos_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "calculos_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "vendas"
      referencedColumns: ["id"]
    }
                  ]
                },"certificados": {
                  Row: {
                    "ativo": boolean,"cn": string,"cnpj": string | null,"criado_em": string,"empresa_id": string,"fingerprint_sha256": string,"id": string,"pfx_cifrado": string,"senha_cifrada": string,"valido_ate": string,"valido_de": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"cn": string,"cnpj"?: string | null,"criado_em"?: string,"empresa_id": string,"fingerprint_sha256": string,"id"?: string,"pfx_cifrado": string,"senha_cifrada": string,"valido_ate": string,"valido_de": string
                  }
                  Update: {
                    "ativo"?: boolean,"cn"?: string,"cnpj"?: string | null,"criado_em"?: string,"empresa_id"?: string,"fingerprint_sha256"?: string,"id"?: string,"pfx_cifrado"?: string,"senha_cifrada"?: string,"valido_ate"?: string,"valido_de"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "certificados_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                },"empresas": {
                  Row: {
                    "ambiente": string,"bairro": string,"c_ativ_sn": string | null,"cep": string,"cnpj": string,"criado_em": string,"crt": number,"csc_cifrado": string | null,"csc_id": string | null,"id": string,"ie": string,"logradouro": string,"municipio_ibge": number,"municipio_nome": string,"nfce_proximo_numero": number,"nfce_serie": number,"nome_fantasia": string | null,"numero": string,"razao_social": string,"rbt12": number | null,"tp_regime_ibscbs": number | null,"uf": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ambiente"?: string,"bairro"?: string,"c_ativ_sn"?: string | null,"cep"?: string,"cnpj": string,"criado_em"?: string,"crt": number,"csc_cifrado"?: string | null,"csc_id"?: string | null,"id"?: string,"ie": string,"logradouro"?: string,"municipio_ibge": number,"municipio_nome": string,"nfce_proximo_numero"?: number,"nfce_serie"?: number,"nome_fantasia"?: string | null,"numero"?: string,"razao_social": string,"rbt12"?: number | null,"tp_regime_ibscbs"?: number | null,"uf": string
                  }
                  Update: {
                    "ambiente"?: string,"bairro"?: string,"c_ativ_sn"?: string | null,"cep"?: string,"cnpj"?: string,"criado_em"?: string,"crt"?: number,"csc_cifrado"?: string | null,"csc_id"?: string | null,"id"?: string,"ie"?: string,"logradouro"?: string,"municipio_ibge"?: number,"municipio_nome"?: string,"nfce_proximo_numero"?: number,"nfce_serie"?: number,"nome_fantasia"?: string | null,"numero"?: string,"razao_social"?: string,"rbt12"?: number | null,"tp_regime_ibscbs"?: number | null,"uf"?: string
                  }
                  Relationships: [
                    
                  ]
                },"membros": {
                  Row: {
                    "criado_em": string,"empresa_id": string,"papel": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "criado_em"?: string,"empresa_id": string,"papel"?: string,"user_id": string
                  }
                  Update: {
                    "criado_em"?: string,"empresa_id"?: string,"papel"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "membros_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                },"nota_eventos": {
                  Row: {
                    "c_stat": string | null,"criado_em": string,"empresa_id": string,"id": string,"nota_id": string | null,"request_xml": string | null,"response_xml": string | null,"tipo": string,"x_motivo": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "c_stat"?: string | null,"criado_em"?: string,"empresa_id": string,"id"?: string,"nota_id"?: string | null,"request_xml"?: string | null,"response_xml"?: string | null,"tipo": string,"x_motivo"?: string | null
                  }
                  Update: {
                    "c_stat"?: string | null,"criado_em"?: string,"empresa_id"?: string,"id"?: string,"nota_id"?: string | null,"request_xml"?: string | null,"response_xml"?: string | null,"tipo"?: string,"x_motivo"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "nota_eventos_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nota_eventos_nota_id_fkey"
      columns: ["nota_id"]
isOneToOne: false
      referencedRelation: "notas"
      referencedColumns: ["id"]
    }
                  ]
                },"notas": {
                  Row: {
                    "ambiente": string,"c_stat": string | null,"chave": string,"emitida_em": string,"empresa_id": string,"id": string,"modelo": number,"numero": number,"protocolo": string | null,"qr_code_url": string | null,"serie": number,"status": string,"venda_id": string,"x_motivo": string | null,"xml": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ambiente": string,"c_stat"?: string | null,"chave": string,"emitida_em"?: string,"empresa_id": string,"id"?: string,"modelo"?: number,"numero": number,"protocolo"?: string | null,"qr_code_url"?: string | null,"serie": number,"status": string,"venda_id": string,"x_motivo"?: string | null,"xml"?: string | null
                  }
                  Update: {
                    "ambiente"?: string,"c_stat"?: string | null,"chave"?: string,"emitida_em"?: string,"empresa_id"?: string,"id"?: string,"modelo"?: number,"numero"?: number,"protocolo"?: string | null,"qr_code_url"?: string | null,"serie"?: number,"status"?: string,"venda_id"?: string,"x_motivo"?: string | null,"xml"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "notas_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notas_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "vendas"
      referencedColumns: ["id"]
    }
                  ]
                },"produtos": {
                  Row: {
                    "ativo": boolean,"cclasstrib": string,"cest": string | null,"cfop": string,"criado_em": string,"csosn": string,"cst_ibscbs": string,"ean": string | null,"empresa_id": string,"id": string,"ncm": string,"nome": string,"preco": number,"sku": string | null,"unidade": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"cclasstrib"?: string,"cest"?: string | null,"cfop"?: string,"criado_em"?: string,"csosn"?: string,"cst_ibscbs"?: string,"ean"?: string | null,"empresa_id": string,"id"?: string,"ncm": string,"nome": string,"preco": number,"sku"?: string | null,"unidade"?: string
                  }
                  Update: {
                    "ativo"?: boolean,"cclasstrib"?: string,"cest"?: string | null,"cfop"?: string,"criado_em"?: string,"csosn"?: string,"cst_ibscbs"?: string,"ean"?: string | null,"empresa_id"?: string,"id"?: string,"ncm"?: string,"nome"?: string,"preco"?: number,"sku"?: string | null,"unidade"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "produtos_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                },"venda_itens": {
                  Row: {
                    "cclasstrib": string,"cfop": string,"csosn": string,"cst_ibscbs": string,"desconto": number,"descricao": string,"empresa_id": string,"id": string,"ncm": string,"numero_item": number,"preco_unitario": number,"produto_id": string | null,"quantidade": number,"total": number,"unidade": string,"venda_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cclasstrib": string,"cfop": string,"csosn": string,"cst_ibscbs": string,"desconto"?: number,"descricao": string,"empresa_id": string,"id"?: string,"ncm": string,"numero_item": number,"preco_unitario": number,"produto_id"?: string | null,"quantidade": number,"total": number,"unidade": string,"venda_id": string
                  }
                  Update: {
                    "cclasstrib"?: string,"cfop"?: string,"csosn"?: string,"cst_ibscbs"?: string,"desconto"?: number,"descricao"?: string,"empresa_id"?: string,"id"?: string,"ncm"?: string,"numero_item"?: number,"preco_unitario"?: number,"produto_id"?: string | null,"quantidade"?: number,"total"?: number,"unidade"?: string,"venda_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "venda_itens_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "venda_itens_produto_id_fkey"
      columns: ["produto_id"]
isOneToOne: false
      referencedRelation: "produtos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "venda_itens_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "vendas"
      referencedColumns: ["id"]
    }
                  ]
                },"venda_pagamentos": {
                  Row: {
                    "empresa_id": string,"id": string,"meio": string,"valor": number,"venda_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "empresa_id": string,"id"?: string,"meio": string,"valor": number,"venda_id": string
                  }
                  Update: {
                    "empresa_id"?: string,"id"?: string,"meio"?: string,"valor"?: number,"venda_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "venda_pagamentos_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "venda_pagamentos_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "vendas"
      referencedColumns: ["id"]
    }
                  ]
                },"vendas": {
                  Row: {
                    "criado_em": string,"data_hora": string,"desconto": number,"empresa_id": string,"id": string,"numero": number | null,"status": string,"total": number,"total_bruto": number,"vendedor_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "criado_em"?: string,"data_hora"?: string,"desconto"?: number,"empresa_id": string,"id"?: string,"numero"?: number | null,"status"?: string,"total"?: number,"total_bruto"?: number,"vendedor_id"?: string | null
                  }
                  Update: {
                    "criado_em"?: string,"data_hora"?: string,"desconto"?: number,"empresa_id"?: string,"id"?: string,"numero"?: number | null,"status"?: string,"total"?: number,"total_bruto"?: number,"vendedor_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "vendas_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "criar_empresa":
{ Args: { "p_bairro": string,"p_c_ativ_sn": string,"p_cep": string,"p_cnpj": string,"p_crt": number,"p_ie": string,"p_logradouro": string,"p_municipio_ibge": number,"p_municipio_nome": string,"p_nome_fantasia": string,"p_numero": string,"p_razao_social": string,"p_rbt12": number,"p_uf": string }; Returns: string
                           },
"empresa_pode_operar":
{ Args: { "p_empresa": string }; Returns: boolean
                           },
"minhas_empresas":
{ Args: Record<PropertyKey, never>; Returns: string[]
                           },
"reservar_numero_nfce":
{ Args: { "p_empresa": string }; Returns: {
              "numero": number,"serie": number
            }[]
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
