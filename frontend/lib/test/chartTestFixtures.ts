/**
 * Chart Test Fixtures
 * 
 * Mock MotionGraph data for all 16 archetypes.
 * Used for testing chart rendering without API calls.
 */

import { MotionGraph, MotionNode, MotionEdge } from '@/lib/types/MotionGraph';

// Helper to create nodes
const node = (id: string, label: string, opts: Partial<MotionNode['data']> = {}): MotionNode => ({
    id,
    type: opts.value ? 'motion-stat' : 'motion-card',
    data: { label, variant: 'neutral', ...opts }
});

// Helper to create edges
const edge = (source: string, target: string, label?: string): MotionEdge => ({
    id: `${source}-${target}`,
    source,
    target,
    label,
    animated: true
});

export const chartTestFixtures: MotionGraph[] = [
    // ═══════════════════════════════════════════════════════════════
    // ESSENTIAL TIER
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'test-process',
        archetype: 'process',
        metadata: { title: 'Software Development Lifecycle' },
        nodes: [
            node('n1', 'Requirements', { icon: 'file-text', variant: 'primary' }),
            node('n2', 'Design', { icon: 'layout', variant: 'secondary' }),
            node('n3', 'Development', { icon: 'code', variant: 'accent' }),
            node('n4', 'Testing', { icon: 'bug', variant: 'warning' }),
            node('n5', 'Deployment', { icon: 'rocket', variant: 'positive' }),
        ],
        edges: [
            edge('n1', 'n2', 'leads to'),
            edge('n2', 'n3', 'informs'),
            edge('n3', 'n4', 'produces'),
            edge('n4', 'n5', 'enables'),
        ]
    },
    {
        id: 'test-cycle',
        archetype: 'cycle',
        metadata: { title: 'Continuous Improvement Cycle' },
        nodes: [
            node('n1', 'Plan', { icon: 'target', variant: 'primary' }),
            node('n2', 'Do', { icon: 'play-circle', variant: 'accent' }),
            node('n3', 'Check', { icon: 'search', variant: 'warning' }),
            node('n4', 'Act', { icon: 'zap', variant: 'positive' }),
        ],
        edges: [
            edge('n1', 'n2'),
            edge('n2', 'n3'),
            edge('n3', 'n4'),
            edge('n4', 'n1'),
        ]
    },
    {
        id: 'test-hierarchy',
        archetype: 'hierarchy',
        metadata: { title: 'Company Organization Chart' },
        nodes: [
            node('n1', 'CEO', { icon: 'crown', variant: 'primary', subLabel: 'Chief Executive' }),
            node('n2', 'CTO', { icon: 'cpu', variant: 'accent', subLabel: 'Technology' }),
            node('n3', 'CFO', { icon: 'dollar-sign', variant: 'positive', subLabel: 'Finance' }),
            node('n4', 'COO', { icon: 'settings', variant: 'secondary', subLabel: 'Operations' }),
        ],
        edges: [
            edge('n1', 'n2'),
            edge('n1', 'n3'),
            edge('n1', 'n4'),
        ]
    },
    {
        id: 'test-comparison',
        archetype: 'comparison',
        metadata: { title: 'Cloud vs On-Premise' },
        nodes: [
            node('n1', 'Cloud Hosting', { icon: 'cloud', variant: 'positive', description: 'Scalable, pay-as-you-go, managed services' }),
            node('n2', 'On-Premise', { icon: 'server', variant: 'negative', description: 'Full control, higher upfront cost, maintenance' }),
        ],
        edges: []
    },
    {
        id: 'test-statistic',
        archetype: 'statistic',
        metadata: { title: 'Key Performance Metrics' },
        nodes: [
            node('n1', '99.9%', { description: 'Uptime SLA', variant: 'positive', value: '99.9%' }),
            node('n2', '< 50ms', { description: 'API Latency', variant: 'accent', value: '< 50ms' }),
            node('n3', '10M+', { description: 'Daily Users', variant: 'primary', value: '10M+' }),
        ],
        edges: []
    },
    {
        id: 'test-grid',
        archetype: 'grid',
        metadata: { title: 'Product Features' },
        nodes: [
            node('n1', 'Real-time Sync', { icon: 'refresh-cw', variant: 'primary', description: 'Instant updates across devices' }),
            node('n2', 'End-to-End Encryption', { icon: 'shield', variant: 'positive', description: 'Military-grade security' }),
            node('n3', 'Offline Mode', { icon: 'wifi-off', variant: 'accent', description: 'Work without internet' }),
            node('n4', 'API Access', { icon: 'terminal', variant: 'secondary', description: 'Developer-friendly integrations' }),
        ],
        edges: []
    },
    // ═══════════════════════════════════════════════════════════════
    // BUSINESS TIER
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'test-timeline',
        archetype: 'timeline',
        metadata: { title: 'Product Roadmap 2024' },
        nodes: [
            node('n1', 'Q1: Beta Launch', { icon: 'flag', variant: 'positive', subLabel: 'January' }),
            node('n2', 'Q2: Mobile App', { icon: 'smartphone', variant: 'primary', subLabel: 'April' }),
            node('n3', 'Q3: Enterprise Features', { icon: 'building', variant: 'accent', subLabel: 'July' }),
            node('n4', 'Q4: Global Expansion', { icon: 'globe', variant: 'warning', subLabel: 'October' }),
        ],
        edges: [
            edge('n1', 'n2'),
            edge('n2', 'n3'),
            edge('n3', 'n4'),
        ]
    },
    {
        id: 'test-funnel',
        archetype: 'funnel',
        metadata: { title: 'Sales Pipeline' },
        nodes: [
            node('n1', 'Leads', { icon: 'users', variant: 'neutral', description: '10,000 prospects' }),
            node('n2', 'Qualified', { icon: 'filter', variant: 'primary', description: '2,500 qualified leads' }),
            node('n3', 'Proposals', { icon: 'file-text', variant: 'accent', description: '500 proposals sent' }),
            node('n4', 'Closed Won', { icon: 'check-circle', variant: 'positive', description: '125 new customers' }),
        ],
        edges: [
            edge('n1', 'n2', '25%'),
            edge('n2', 'n3', '20%'),
            edge('n3', 'n4', '25%'),
        ]
    },
    {
        id: 'test-pyramid',
        archetype: 'pyramid',
        metadata: { title: "Maslow's Hierarchy of Needs" },
        nodes: [
            node('n1', 'Self-Actualization', { icon: 'star', variant: 'accent', description: 'Achieving full potential' }),
            node('n2', 'Esteem', { icon: 'award', variant: 'primary', description: 'Recognition and respect' }),
            node('n3', 'Love/Belonging', { icon: 'heart', variant: 'warning', description: 'Social connections' }),
            node('n4', 'Safety', { icon: 'shield', variant: 'secondary', description: 'Security and stability' }),
            node('n5', 'Physiological', { icon: 'home', variant: 'neutral', description: 'Basic survival needs' }),
        ],
        edges: []
    },
    {
        id: 'test-mindmap',
        archetype: 'mindmap',
        metadata: { title: 'Digital Marketing Channels' },
        nodes: [
            node('n1', 'Marketing', { icon: 'target', variant: 'primary' }),
            node('n2', 'SEO', { icon: 'search', variant: 'accent' }),
            node('n3', 'Social Media', { icon: 'share-2', variant: 'positive' }),
            node('n4', 'Email', { icon: 'mail', variant: 'warning' }),
            node('n5', 'PPC Ads', { icon: 'dollar-sign', variant: 'negative' }),
            node('n6', 'Content', { icon: 'file-text', variant: 'secondary' }),
        ],
        edges: [
            edge('n1', 'n2'),
            edge('n1', 'n3'),
            edge('n1', 'n4'),
            edge('n1', 'n5'),
            edge('n1', 'n6'),
        ]
    },
    // ═══════════════════════════════════════════════════════════════
    // TECHNICAL TIER
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'test-code',
        archetype: 'code',
        metadata: { title: 'API Authentication Flow' },
        nodes: [
            node('n1', 'Request Token', { icon: 'key', description: 'POST /api/auth/token\n{ "client_id": "xxx", "secret": "yyy" }' }),
            node('n2', 'Validate JWT', { icon: 'shield-check', description: 'const decoded = jwt.verify(token, SECRET);\nif (!decoded) throw new AuthError();' }),
            node('n3', 'Access Resource', { icon: 'database', description: 'const data = await db.query(sql`\n  SELECT * FROM resources\n  WHERE user_id = ${userId}\n`);' }),
        ],
        edges: [
            edge('n1', 'n2', 'returns JWT'),
            edge('n2', 'n3', 'authorized'),
        ]
    },
    {
        id: 'test-math',
        archetype: 'math',
        metadata: { title: 'Compound Interest Formula' },
        nodes: [
            node('n1', 'A = P(1 + r/n)^(nt)', { icon: 'calculator', description: 'A = final amount\nP = principal\nr = interest rate\nn = compounds/year\nt = time in years' }),
            node('n2', 'Example', { icon: 'dollar-sign', description: '$10,000 at 5% for 10 years:\nA = 10000(1 + 0.05/12)^(12×10)\nA = $16,470.09' }),
        ],
        edges: []
    },
    {
        id: 'test-architecture',
        archetype: 'architecture',
        metadata: { title: 'Microservices Architecture' },
        nodes: [
            node('n1', 'API Gateway', { icon: 'globe', variant: 'primary', subLabel: 'Load Balancer' }),
            node('n2', 'Auth Service', { icon: 'lock', variant: 'accent', subLabel: 'JWT/OAuth' }),
            node('n3', 'User Service', { icon: 'users', variant: 'secondary', subLabel: 'PostgreSQL' }),
            node('n4', 'Order Service', { icon: 'shopping-cart', variant: 'positive', subLabel: 'MongoDB' }),
            node('n5', 'Message Queue', { icon: 'mail', variant: 'warning', subLabel: 'RabbitMQ' }),
        ],
        edges: [
            edge('n1', 'n2', 'validates'),
            edge('n1', 'n3', 'routes'),
            edge('n1', 'n4', 'routes'),
            edge('n3', 'n5', 'publishes'),
            edge('n4', 'n5', 'publishes'),
        ]
    },
    // ═══════════════════════════════════════════════════════════════
    // PEDAGOGICAL TIER
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'test-matrix',
        archetype: 'matrix',
        metadata: { title: 'SWOT Analysis' },
        nodes: [
            node('n1', 'Strengths', { icon: 'thumbs-up', variant: 'positive', description: 'Strong brand, skilled team' }),
            node('n2', 'Weaknesses', { icon: 'thumbs-down', variant: 'negative', description: 'Limited budget, tech debt' }),
            node('n3', 'Opportunities', { icon: 'trending-up', variant: 'accent', description: 'New markets, partnerships' }),
            node('n4', 'Threats', { icon: 'alert-triangle', variant: 'warning', description: 'Competition, regulations' }),
        ],
        edges: []
    },
    {
        id: 'test-metaphor',
        archetype: 'metaphor',
        metadata: { title: 'The Iceberg Model of Culture' },
        nodes: [
            node('n1', 'Behaviors', { icon: 'eye', description: 'Dress code, language, rituals' }),
            node('n2', 'Policies', { icon: 'file-text', description: 'Written rules and procedures' }),
            node('n3', 'Values', { icon: 'heart', description: 'What we believe matters' }),
            node('n4', 'Assumptions', { icon: 'brain', description: 'Unconscious beliefs' }),
            node('n5', 'Core Identity', { icon: 'anchor', description: 'Who we really are' }),
        ],
        edges: []
    },
    {
        id: 'test-anatomy',
        archetype: 'anatomy',
        metadata: { title: 'Anatomy of a URL' },
        nodes: [
            node('n1', 'URL Structure', { icon: 'link', variant: 'primary' }),
            node('n2', 'Protocol (https://)', { icon: 'shield', variant: 'positive' }),
            node('n3', 'Domain (example.com)', { icon: 'globe', variant: 'accent' }),
            node('n4', 'Path (/api/users)', { icon: 'folder', variant: 'secondary' }),
            node('n5', 'Query (?id=123)', { icon: 'search', variant: 'warning' }),
        ],
        edges: [
            edge('n1', 'n2'),
            edge('n1', 'n3'),
            edge('n1', 'n4'),
            edge('n1', 'n5'),
        ]
    },
];

export default chartTestFixtures;
