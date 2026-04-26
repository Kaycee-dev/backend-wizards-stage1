import './styles.css';

export const metadata = {
  title: 'Insighta Labs+',
  description: 'Secure profile intelligence portal',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
