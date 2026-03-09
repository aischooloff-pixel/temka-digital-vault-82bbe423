import { useState } from 'react';
import { User, Package, Heart, Headphones, Bell, Settings, Shield, Gift, LogOut, Star, ChevronRight, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const mockOrders = [
  { id: 'TK-A1B2C3', product: 'Windows 11 Pro — Lifetime Key', date: '2024-12-15', status: 'delivered', price: 24.99 },
  { id: 'TK-D4E5F6', product: 'Netflix Premium — 12 Months', date: '2024-12-10', status: 'delivered', price: 29.99 },
  { id: 'TK-G7H8I9', product: 'Spotify Premium — 6 Months', date: '2024-12-08', status: 'processing', price: 19.99 },
];

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: User },
  { id: 'orders', label: 'Order History', icon: Package },
  { id: 'favorites', label: 'Favorites', icon: Heart },
  { id: 'support', label: 'Support Tickets', icon: Headphones },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const Account = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="container-main mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-8">My Account</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="space-y-1">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${activeTab === tab.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
          <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors mt-4">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Welcome */}
              <div className="bg-card border border-border/50 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xl font-bold font-display">U</div>
                  <div>
                    <h2 className="font-display font-semibold text-lg">Welcome back!</h2>
                    <p className="text-sm text-muted-foreground">user@example.com</p>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total Orders', value: '3', icon: Package },
                  { label: 'Favorites', value: '5', icon: Heart },
                  { label: 'Coupons', value: '1', icon: Gift },
                  { label: 'Tickets', value: '0', icon: Headphones },
                ].map((s, i) => (
                  <div key={i} className="bg-card border border-border/50 rounded-xl p-4 text-center">
                    <s.icon className="w-5 h-5 text-primary mx-auto mb-2" />
                    <div className="font-display font-bold text-xl">{s.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Recent Orders */}
              <div className="bg-card border border-border/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-semibold">Recent Orders</h3>
                  <button onClick={() => setActiveTab('orders')} className="text-sm text-primary hover:underline">View all</button>
                </div>
                <div className="space-y-3">
                  {mockOrders.slice(0, 2).map(order => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                      <div>
                        <div className="text-sm font-medium">{order.product}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span className="font-mono">{order.id}</span> · {order.date}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">${order.price}</div>
                        <div className={`text-xs flex items-center gap-1 mt-0.5 ${order.status === 'delivered' ? 'text-primary' : 'text-warning'}`}>
                          {order.status === 'delivered' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {order.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Referral */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
                <Gift className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-display font-semibold">Refer a Friend</h3>
                <p className="text-sm text-muted-foreground mt-1">Share your referral link and earn 5% commission on every purchase.</p>
                <div className="flex gap-2 mt-4">
                  <input type="text" readOnly value="https://temka.store/ref/USER123"
                    className="flex-1 h-9 px-3 bg-secondary border border-border rounded-lg text-xs text-muted-foreground font-mono" />
                  <Button size="sm" onClick={() => navigator.clipboard.writeText('https://temka.store/ref/USER123')}>Copy</Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="bg-card border border-border/50 rounded-xl p-6">
              <h3 className="font-display font-semibold mb-4">Order History</h3>
              <div className="space-y-3">
                {mockOrders.map(order => (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                    <div>
                      <div className="text-sm font-medium">{order.product}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                        <span className="font-mono">{order.id}</span> · {order.date}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">${order.price}</div>
                      <div className={`text-xs flex items-center gap-1 mt-1 ${order.status === 'delivered' ? 'text-primary' : 'text-warning'}`}>
                        {order.status === 'delivered' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {order.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'favorites' && (
            <div className="text-center py-12">
              <Heart className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-display font-semibold">Your Favorites</h3>
              <p className="text-sm text-muted-foreground mt-1">Products you've saved will appear here</p>
              <Link to="/catalog"><Button variant="outline" className="mt-4">Browse Catalog</Button></Link>
            </div>
          )}

          {activeTab === 'support' && (
            <div className="text-center py-12">
              <Headphones className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-display font-semibold">No Open Tickets</h3>
              <p className="text-sm text-muted-foreground mt-1">You don't have any active support tickets</p>
              <Link to="/support"><Button variant="outline" className="mt-4">Create Ticket</Button></Link>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="text-center py-12">
              <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-display font-semibold">All Caught Up</h3>
              <p className="text-sm text-muted-foreground mt-1">No new notifications</p>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-card border border-border/50 rounded-xl p-6">
                <h3 className="font-display font-semibold mb-4">Profile Settings</h3>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1.5">Email</label>
                    <input type="email" value="user@example.com" readOnly className="w-full h-10 px-4 bg-secondary border border-border rounded-lg text-sm text-foreground" />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1.5">Telegram</label>
                    <input type="text" placeholder="@username" className="w-full h-10 px-4 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <Button>Save Changes</Button>
                </div>
              </div>
              <div className="bg-card border border-border/50 rounded-xl p-6">
                <h3 className="font-display font-semibold mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> Security</h3>
                <div className="space-y-3 max-w-md">
                  <Button variant="outline" className="w-full justify-start">Change Password</Button>
                  <Button variant="outline" className="w-full justify-start">Enable Two-Factor Auth</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Account;
