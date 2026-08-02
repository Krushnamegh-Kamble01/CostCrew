import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CostCrew — Split Expenses, Zero Stress',
  description: 'Track shared group bills, scan receipts instantly with AI, and settle balances seamlessly with zero math.',
  icons: {
    icon: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  )
}
