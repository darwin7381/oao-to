import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Copy, Check, Terminal, BookOpen, Shield, Zap, Globe, Layout, AlignLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

export default function ApiDocs() {
  const [activeSection, setActiveSection] = useState('intro');

  // Simple scroll spy logic (optional, for basic highlighting)
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['intro', 'authentication', 'endpoints', 'rate-limits', 'credits', 'errors', 'examples'];
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top >= 0 && rect.top <= 300) {
            setActiveSection(section);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(id);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col lg:flex-row gap-12">

        {/* Sidebar Navigation - Desktop Sticky */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-24 space-y-8">
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Documentation
              </h3>
              <nav className="space-y-1">
                {[
                  { id: 'intro', label: 'Introduction' },
                  { id: 'authentication', label: 'Authentication' },
                  { id: 'endpoints', label: 'Endpoints' },
                  { id: 'rate-limits', label: 'Rate Limits' },
                  { id: 'credits', label: 'Credits & Billing' },
                  { id: 'errors', label: 'Errors' },
                  { id: 'examples', label: 'Code Examples' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollTo(item.id)}
                    className={cn(
                      "w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                      activeSection === item.id
                        ? "bg-orange-50 text-orange-600 shadow-sm"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>

            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 text-white border-0">
              <CardContent className="p-5">
                <h4 className="font-bold mb-2 text-sm">Need Help?</h4>
                <p className="text-xs text-gray-400 mb-4">
                  Join our Discord community or contact support for assistance.
                </p>
                <Button size="sm" variant="secondary" className="w-full text-xs h-8">
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">

          {/* Hero / Intro */}
          <section id="intro" className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-2xl bg-orange-100 flex items-center justify-center">
                <Terminal className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h1 className="text-4xl font-black text-gray-900 tracking-tight">API Documentation</h1>
                <p className="text-gray-500 font-medium">Version 1.0.0</p>
              </div>
            </div>

            <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mb-8">
              Build powerful integrations with the OAO.TO API. Programmatically create short links, manage your branded domain, and access real-time analytics.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
              <div className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm flex items-start gap-4">
                <div className="p-2 bg-green-50 rounded-lg text-green-600"><Zap className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-bold text-gray-900">High Performance</h3>
                  <p className="text-sm text-gray-500">Global edge network ensures sub-millisecond redirects.</p>
                </div>
              </div>
              <div className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm flex items-start gap-4">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Globe className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-bold text-gray-900">Standard REST</h3>
                  <p className="text-sm text-gray-500">Predictable resource-oriented URLs and JSON bodies.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Authentication */}
          <section id="authentication" className="mb-16 scroll-mt-24">
            <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
              <Shield className="w-6 h-6 text-gray-400" />
              Authentication
            </h2>
            <Card className="mb-6">
              <CardContent className="p-8">
                <p className="text-gray-600 mb-6">
                  The OAO.TO API uses <strong className="text-gray-900">Bearer Tokens</strong> for authentication.
                  You must include your API Key in the <code className="text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded text-sm">Authorization</code> header for all requests.
                </p>
                <CodeBlock
                  title="Header Format"
                  code="Authorization: Bearer oao_live_xxxxxxxxxxxxxxxxxxxx"
                  language="http"
                />

                <div className="mt-6 flex items-start gap-3 p-4 bg-yellow-50 text-yellow-800 rounded-xl text-sm border border-yellow-100">
                  <Shield className="w-5 h-5 flex-shrink-0" />
                  <p>
                    <strong>Security Notice:</strong> Your API keys carry many privileges, so be sure to keep them secure! Do not share your secret API keys in publicly accessible areas such as GitHub, client-side code, and so forth.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Endpoints */}
          <section id="endpoints" className="mb-16 scroll-mt-24">
            <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
              <Layout className="w-6 h-6 text-gray-400" />
              Endpoints
            </h2>

            <div className="space-y-8">
              <EndpointCard
                method="POST"
                path="/v1/links"
                title="Create a short link"
                description="Creates a new short link with optional custom alias, tags, and metadata."
              >
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Request Body</h4>
                  <Table
                    headers={['Property', 'Type', 'Required', 'Description']}
                    rows={[
                      [<Code>url</Code>, 'string', 'Yes', 'The destination URL (must be valid)'],
                      [<Code>customSlug</Code>, 'string', 'No', 'Custom alias for the link (e.g. "my-link")'],
                      [<Code>title</Code>, 'string', 'No', 'Social meta title'],
                      [<Code>tags</Code>, 'array', 'No', 'Array of string tags for organization'],
                    ]}
                  />

                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mt-6">Example Request</h4>
                  <CodeBlock
                    language="bash"
                    code={`curl -X POST https://api.oao.to/v1/links \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com/very-long-product-page",
    "customSlug": "summer-sale",
    "tags": ["marketing", "promo"]
  }'`}
                  />
                </div>
              </EndpointCard>

              <EndpointCard
                method="GET"
                path="/v1/links"
                title="List all links"
                description="Retrieve a paginated list of your short links."
              >
                <CodeBlock
                  language="bash"
                  code={`curl https://api.oao.to/v1/links?limit=10&page=1 \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
                />
              </EndpointCard>
            </div>
          </section>

          {/* Rate Limits */}
          <section id="rate-limits" className="mb-16 scroll-mt-24">
            <h2 className="text-2xl font-black text-gray-900 mb-6">Rate Limits</h2>
            <Card>
              <CardContent className="p-8">
                <p className="text-gray-600 mb-6">
                  API usage is capped based on your plan to ensure service stability. Limits are applied per API key.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-gray-50 rounded-xl text-center">
                    <div className="font-bold text-gray-900">Free</div>
                    <div className="text-sm text-gray-500">60 req/min</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl text-center">
                    <div className="font-bold text-purple-600">Pro</div>
                    <div className="text-sm text-gray-500">300 req/min</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl text-center">
                    <div className="font-bold text-black">Enterprise</div>
                    <div className="text-sm text-gray-500">Unlimited</div>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Check the <code className="text-orange-600">X-RateLimit-Remaining</code> header in the response to monitor your current usage.
                </p>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
}

// Helper Components

function CodeBlock({ code, language, title }: { code: string; language: string; title?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl overflow-hidden bg-[#1e1e1e] shadow-lg border border-gray-800">
      <div className="flex items-center justify-between px-4 py-3 bg-[#252526] border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
          </div>
          {title && <span className="ml-3 text-xs text-gray-400 font-mono">{title}</span>}
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="bg-gray-700 text-gray-300 border-0 h-5 text-[10px] uppercase">
            {language}
          </Badge>
          <button
            onClick={handleCopy}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div className="p-4 overflow-x-auto">
        <pre className="text-sm font-mono text-gray-300 leading-relaxed">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono border border-gray-200">
      {children}
    </code>
  );
}

function EndpointCard({ method, path, title, description, children }: {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  title: string,
  description: string,
  children?: React.ReactNode
}) {
  const colors = {
    GET: 'bg-blue-100 text-blue-700',
    POST: 'bg-green-100 text-green-700',
    PUT: 'bg-orange-100 text-orange-700',
    DELETE: 'bg-red-100 text-red-700',
  };

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-gray-100 bg-gray-50/50 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={cn("px-3 py-1 rounded-lg text-sm font-bold", colors[method])}>
                {method}
              </span>
              <code className="text-lg font-mono font-semibold text-gray-800">{path}</code>
            </div>
            <p className="text-gray-600">{description}</p>
          </div>
        </div>
      </div>
      {children && <CardContent className="p-6">{children}</CardContent>}
    </Card>
  );
}

function Table({ headers, rows }: { headers: string[], rows: (React.ReactNode | string)[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 text-gray-500 uppercase font-medium text-xs">
          <tr>
            {headers.map((h) => <th key={h} className="px-6 py-3">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50/50 transition-colors">
              {row.map((cell, j) => <td key={j} className="px-6 py-4">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

