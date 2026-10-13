import DashboardPage from './pages/DashboardPage.jsx';

export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Finance Dashboard</h1>
        <p>IBM vs. major competitors</p>
      </header>
      <main>
        <DashboardPage />
      </main>
    </div>
  );
}
