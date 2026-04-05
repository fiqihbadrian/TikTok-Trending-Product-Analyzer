import './globals.css';

export const metadata = {
  title: 'TikTok Trending Product Analyzer',
  description: 'Web analyzer untuk memantau dan menganalisa produk trending di TikTok secara realtime',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
