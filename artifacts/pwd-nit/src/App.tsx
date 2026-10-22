import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { setApiKey } from '@/lib/api-auth';

import Dashboard from '@/pages/dashboard';
import Contractors from '@/pages/contractors';
import SessionsList from '@/pages/sessions/index';
import NewSession from '@/pages/sessions/new';
import SessionDetail from '@/pages/sessions/detail';

let promptedForApiKey = false;

/** On the first 401, ask once for the API key and replay the failed queries. */
function handleUnauthorized(error: unknown) {
  const status = (error as { status?: number } | null)?.status;
  if (status !== 401 || promptedForApiKey) return;
  promptedForApiKey = true;
  const key = window.prompt("API key");
  if (key) {
    setApiKey(key);
    queryClient.invalidateQueries();
  }
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleUnauthorized }),
  mutationCache: new MutationCache({ onError: handleUnauthorized }),
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/contractors" component={Contractors} />
      <Route path="/sessions" component={SessionsList} />
      <Route path="/sessions/new" component={NewSession} />
      <Route path="/sessions/:id" component={SessionDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
