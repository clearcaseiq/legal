import { lazy, Suspense, type ComponentType } from 'react'

type Loader<P> = () => Promise<{ default: ComponentType<P> } | ComponentType<P>>

export default function dynamic<P extends object>(loader: Loader<P>, _options?: unknown) {
  const Lazy = lazy(async () => {
    const mod = await loader()
    return 'default' in (mod as object) ? (mod as { default: ComponentType<P> }) : { default: mod as ComponentType<P> }
  })
  return function DynamicComponent(props: P) {
    return (
      <Suspense fallback={null}>
        <Lazy {...(props as any)} />
      </Suspense>
    )
  }
}
