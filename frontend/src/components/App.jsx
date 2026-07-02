import { AuthProvider } from '../context/AuthContext';
import DashboardLayout from './Layout';
import { Toaster } from 'react-hot-toast';

const pages = import.meta.glob('../react-pages/**/*.jsx', { eager: true });

export default function App({ pagePath, currentPath, hideLayout = false, ...props }) {
  const module = pages[`../react-pages/${pagePath}.jsx`];
  const Component = module ? module.default : () => <div>Page not found: {pagePath}</div>;

  return (
    <AuthProvider>
      {hideLayout ? (
        <Component {...props} />
      ) : (
        <DashboardLayout currentPath={currentPath}>
          <Component {...props} />
        </DashboardLayout>
      )}
      <Toaster />
    </AuthProvider>
  );
}
