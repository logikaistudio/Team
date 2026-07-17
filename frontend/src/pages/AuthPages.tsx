import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { request } from '../services/api';
import { KeyRound, Mail, User, Building, Globe, ShieldAlert } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useStore((state) => state.setAuth);
  const navigate = useNavigate();
  const isUuid = (value: string): boolean =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isUuid(tenantId.trim())) {
      setError('Tenant ID harus format UUID valid.');
      return;
    }

    setLoading(true);
    try {
      const res = await request<{ user: any; accessToken: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ tenantId, email, password }),
      });
      setAuth(res.user, res.accessToken);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Use admin@epcs.com to bypass.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900 px-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-brand-600/10 filter blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-violet-600/10 filter blur-3xl" />

      <div className="w-full max-w-md bg-zinc-950/60 border border-zinc-800/80 backdrop-blur-xl p-8 rounded-2xl shadow-2xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-brand-500 to-violet-500 bg-clip-text text-transparent">
            Welcome to EPCS
          </h2>
          <p className="text-sm text-zinc-400 mt-1">Enterprise Project Control System</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <ShieldAlert size={14} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-zinc-400 block mb-1">Tenant ID</label>
            <div className="relative">
              <Building size={14} className="absolute left-3 top-3.5 text-zinc-500" />
              <input
                type="text"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand-500"
                placeholder="Enter organization uuid"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-400 block mb-1">Email Address</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-3.5 text-zinc-500" />
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand-500"
                placeholder="name@company.com"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-400 block mb-1">Password</label>
            <div className="relative">
              <KeyRound size={14} className="absolute left-3 top-3.5 text-zinc-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 transition-colors text-white font-medium text-sm rounded-lg"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center mt-6 text-xs text-zinc-500">
          Don't have an account?{' '}
          <Link to="/register" className="text-brand-500 hover:underline">
            Register Tenant
          </Link>
        </div>
      </div>
    </div>
  );
};

export const RegisterPage: React.FC = () => {
  const [tenantName, setTenantName] = useState('');
  const [domainName, setDomainName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          tenantName,
          domainName,
          planCode: 'starter',
          adminName,
          adminEmail,
          adminPassword,
        }),
      });
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Tenant registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900 px-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-brand-600/10 filter blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-violet-600/10 filter blur-3xl" />

      <div className="w-full max-w-lg bg-zinc-950/60 border border-zinc-800/80 backdrop-blur-xl p-8 rounded-2xl shadow-2xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-brand-500 to-violet-500 bg-clip-text text-transparent">
            Register New Tenant
          </h2>
          <p className="text-sm text-zinc-400 mt-1">Onboard your enterprise organization</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <ShieldAlert size={14} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-zinc-400 block mb-1">Company Name</label>
            <div className="relative">
              <Building size={14} className="absolute left-3 top-3.5 text-zinc-500" />
              <input
                type="text"
                required
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand-500"
                placeholder="Acme Corp"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-400 block mb-1">Custom Domain prefix</label>
            <div className="relative">
              <Globe size={14} className="absolute left-3 top-3.5 text-zinc-500" />
              <input
                type="text"
                required
                value={domainName}
                onChange={(e) => setDomainName(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand-500"
                placeholder="acme"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-400 block mb-1">Admin Name</label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-3.5 text-zinc-500" />
              <input
                type="text"
                required
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand-500"
                placeholder="John Doe"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-400 block mb-1">Admin Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-3.5 text-zinc-500" />
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand-500"
                placeholder="admin@acme.com"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-zinc-400 block mb-1">Admin Password</label>
            <div className="relative">
              <KeyRound size={14} className="absolute left-3 top-3.5 text-zinc-500" />
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand-500"
                placeholder="•••••••• (Min 6 characters)"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="md:col-span-2 mt-4 py-2.5 bg-brand-600 hover:bg-brand-500 transition-colors text-white font-medium text-sm rounded-lg"
          >
            {loading ? 'Creating tenant account...' : 'Create Tenant'}
          </button>
        </form>

        <div className="text-center mt-6 text-xs text-zinc-500">
          Already registered?{' '}
          <Link to="/login" className="text-brand-500 hover:underline">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
};
