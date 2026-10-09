import { zodResolver } from '@hookform/resolvers/zod'
import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Choice'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { Alert, Card, PageHeader } from '@/components/ui/Feedback'
import { Field, Input, InputGroup, Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/features/auth/AuthProvider'
import { ImagePicker } from '@/features/catalog/components/ImagePicker'
import type { OpeningHour } from '@/features/public-menu/types'
import { env } from '@/lib/env'
import { errorCode, errorMessage } from '@/lib/errors'
import { formatPhone, normalizeBrazilianPhone } from '@/lib/phone'
import type { StoreRow, StoreUpdate } from '@/types/database'
import { removeStoreImage, uploadStoreImage } from '../api'
import { OpeningHoursEditor } from '../components/OpeningHoursEditor'
import { OperationForm } from '../components/OperationForm'
import { operationDefaults, operationToUpdate } from '../operation'
import { useStore, useUpdateStore } from '../hooks'
import { storeProfileSchema, type StoreProfileValues } from '../schemas'
import { storeUrlPrefix } from '../storeUrl'

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description ? <p className="mt-0.5 mb-5 text-sm text-muted">{description}</p> : <div className="mb-5" />}
      {children}
    </Card>
  )
}

export default function SettingsPage() {
  const store = useStore()
  const update = useUpdateStore()
  const toast = useToast()

  const save = async (values: StoreUpdate, message = 'Alterações salvas.') => {
    await update.mutateAsync({ storeId: store.id, values })
    toast.success(message)
  }

  return (
    <>
      <title>Configurações — Pratuca</title>
      <PageHeader title="Configurações" description="Dados da loja, atendimento, horários e conta." />
      <div className="flex flex-col gap-6">
        <Section title="Status da loja">
          <div className="flex flex-col gap-4">
            <Switch
              checked={store.is_published}
              onChange={(v) => void save({ is_published: v, ...(v ? {} : { is_open: false }) }, v ? 'Cardápio publicado.' : 'Cardápio despublicado.').catch((e) => toast.error(errorMessage(e)))}
              disabled={update.isPending || !store.whatsapp}
              label="Cardápio publicado"
              description={store.whatsapp ? 'Quando desligado, o link mostra que a loja não foi encontrada.' : 'Informe o WhatsApp para publicar.'}
            />
            <Switch
              checked={store.is_open}
              onChange={(v) => void save({ is_open: v }, v ? 'Loja aberta.' : 'Loja fechada.').catch((e) => toast.error(errorMessage(e)))}
              disabled={update.isPending || !store.is_published}
              label="Aberta para pedidos"
              description="Fechada, o cliente vê o cardápio mas não consegue enviar pedidos."
            />
          </div>
        </Section>

        <ProfileSection store={store} />

        <Section title="Atendimento" description="WhatsApp, entrega, retirada, taxa, pedido mínimo e formas de pagamento.">
          <OperationForm
            key={store.updated_at}
            defaultValues={operationDefaults(store)}
            onSubmit={async (values) => {
              try {
                await save(operationToUpdate(values))
              } catch (e) {
                toast.error(errorMessage(e))
              }
            }}
            footer={({ isSubmitting }) => (
              <Button type="submit" loading={isSubmitting} className="self-end">
                Salvar atendimento
              </Button>
            )}
          />
        </Section>

        <Section title="Horários de funcionamento" description="Exibidos no cardápio para o cliente.">
          <OpeningHoursEditor
            value={(Array.isArray(store.opening_hours) ? store.opening_hours : []) as unknown as OpeningHour[]}
            saving={update.isPending}
            onSave={(hours) => save({ opening_hours: hours as unknown as StoreUpdate['opening_hours'] }).catch((e) => toast.error(errorMessage(e)))}
          />
        </Section>

        <AccountSection />
      </div>
    </>
  )
}

function ProfileSection({ store }: { store: StoreRow }) {
  const update = useUpdateStore()
  const toast = useToast()
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoRemoved, setLogoRemoved] = useState(false)
  const [pendingSlug, setPendingSlug] = useState<StoreProfileValues | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<StoreProfileValues>({
    resolver: zodResolver(storeProfileSchema),
    defaultValues: {
      name: store.name,
      slug: store.slug,
      description: store.description ?? '',
      welcome_message: store.welcome_message ?? '',
      phone: store.phone ? formatPhone(store.phone) : '',
      address: store.address ?? '',
    },
  })

  const persist = async (values: StoreProfileValues) => {
    try {
      let logoPath = logoRemoved ? null : store.logo_path
      if (logoFile) logoPath = await uploadStoreImage(store.id, 'logo', logoFile)
      await update.mutateAsync({
        storeId: store.id,
        values: {
          name: values.name,
          slug: values.slug,
          description: values.description || null,
          welcome_message: values.welcome_message || null,
          phone: values.phone ? normalizeBrazilianPhone(values.phone) : null,
          address: values.address || null,
          logo_path: logoPath,
        },
      })
      if (store.logo_path && store.logo_path !== logoPath) void removeStoreImage(store.logo_path)
      setLogoFile(null)
      setLogoRemoved(false)
      toast.success('Dados da loja salvos.')
    } catch (error) {
      if (errorCode(error) === null && /slug|duplicate/i.test(String((error as { message?: string }).message))) {
        setError('slug', { message: 'Este endereço já está em uso. Escolha outro.' })
      } else {
        toast.error(errorMessage(error))
      }
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    if (values.slug !== store.slug) setPendingSlug(values)
    else await persist(values)
  })

  return (
    <Section title="Dados da loja" description="Como sua loja aparece para os clientes.">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <ImagePicker label="Logo" currentPath={store.logo_path} file={logoFile} removed={logoRemoved} onSelect={(f) => { setLogoFile(f); if (f) setLogoRemoved(false) }} onRemove={() => setLogoRemoved(true)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome comercial" error={errors.name?.message} required>
            <Input {...register('name')} />
          </Field>
          <Field label="Endereço do cardápio" error={errors.slug?.message} hint="Mudar o endereço invalida o link antigo." required>
            <InputGroup prefix={storeUrlPrefix()}>
              <Input autoCapitalize="none" spellCheck={false} {...register('slug')} />
            </InputGroup>
          </Field>
        </div>
        <Field label="Descrição" error={errors.description?.message}>
          <Textarea rows={2} placeholder="Ex.: Marmitas caseiras feitas no dia, com tempero de vó." {...register('description')} />
        </Field>
        <Field label="Mensagem de apresentação" error={errors.welcome_message?.message} hint="Aparece no topo do cardápio.">
          <Input placeholder="Ex.: Pedidos até as 11h para entrega no almoço!" {...register('welcome_message')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Telefone de contato (opcional)" error={errors.phone?.message}>
            <Input type="tel" inputMode="tel" {...register('phone')} />
          </Field>
          <Field label="Endereço comercial (opcional)" error={errors.address?.message} hint="Mostrado para quem escolhe retirada.">
            <Input {...register('address')} />
          </Field>
        </div>
        <Button type="submit" loading={isSubmitting || update.isPending} className="self-end">
          Salvar dados
        </Button>
      </form>
      <ConfirmDialog
        open={Boolean(pendingSlug)}
        tone="primary"
        title="Alterar o endereço do cardápio?"
        description="O link antigo deixará de funcionar. Atualize o link onde você já compartilhou (WhatsApp, Instagram, impressos)."
        confirmLabel="Alterar endereço"
        loading={update.isPending}
        onConfirm={() => {
          const values = pendingSlug
          setPendingSlug(null)
          if (values) void persist(values)
        }}
        onClose={() => setPendingSlug(null)}
      />
    </Section>
  )
}

function AccountSection() {
  const { user } = useAuth()
  const support = env.supportEmail
  return (
    <Section title="Conta" description="Dados de acesso e privacidade.">
      <dl className="mb-5 text-sm">
        <dt className="text-muted">E-mail de acesso</dt>
        <dd className="font-medium">{user?.email}</dd>
      </dl>
      <Alert tone="info" title="Exclusão de conta e dados">
        Para excluir sua conta e todos os dados da loja, envie a solicitação pelo e-mail cadastrado
        {support ? (
          <>
            {' '}para <a className="font-semibold underline" href={`mailto:${support}?subject=${encodeURIComponent('Exclusão de conta Pratuca')}`}>{support}</a>
          </>
        ) : ' para o suporte (canal em configuração)'}
        . A exclusão é feita manualmente pela equipe para evitar perdas acidentais. Veja a <a className="underline" href="/privacidade">política de privacidade</a>.
      </Alert>
    </Section>
  )
}
