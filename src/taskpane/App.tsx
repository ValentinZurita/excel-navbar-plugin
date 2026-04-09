import { NavigationProvider } from '../ui/navigation/NavigationProvider';
import { TaskpaneAppContainer } from '../ui/taskpane/TaskpaneAppContainer';
import { useOfficeTheme } from './useOfficeTheme';

export function App() {
  useOfficeTheme();

  return (
    <NavigationProvider>
      <TaskpaneAppContainer />
    </NavigationProvider>
  );
}
