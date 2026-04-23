import { NavigationProvider } from '../ui/navigation/NavigationProvider';
import { TaskpaneAppContainer } from '../ui/taskpane/TaskpaneAppContainer';
import { TaskpaneErrorBoundary } from '../ui/components/TaskpaneErrorBoundary';
import { useOfficeTheme } from './useOfficeTheme';

export function App() {
  useOfficeTheme();

  return (
    <TaskpaneErrorBoundary>
      <NavigationProvider>
        <TaskpaneAppContainer />
      </NavigationProvider>
    </TaskpaneErrorBoundary>
  );
}
