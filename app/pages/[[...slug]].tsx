import type { GetServerSideProps } from 'next'
import dynamic from 'next/dynamic'

const NextRoot = dynamic(() => import('../src/next-root'), {
  ssr: false,
})

export default function CatchAllPage() {
  return <NextRoot />
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    props: {},
  }
}