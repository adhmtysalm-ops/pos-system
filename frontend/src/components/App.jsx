import { AuthProvider } from '../context/AuthContext';
import DashboardLayout from './Layout';
import { Toaster } from 'react-hot-toast';

export default function App({ component: Component, currentPath, hideLayout = false, ...props }) {
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
