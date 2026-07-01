import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/stores/cartStore";
import { AuthProvider } from "@/stores/authStore";
import { CurrencyProvider } from "@/stores/currencyStore";
import AdminLayout from "@/components/layout/AdminLayout";

// Public pages
import Index from "./pages/Index";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import NotFound from "./pages/NotFound";

// Admin pages
import AdminLogin from "./pages/AdminLogin";
import Dashboard from "./pages/admin/Dashboard";
import ProductsPanel from "./pages/admin/ProductsPanel";
import OrdersPanel from "./pages/admin/OrdersPanel";
import CategoriesPanel from "./pages/admin/CategoriesPanel";
import UsersPanel from "./pages/admin/UsersPanel";
import Settings from "./pages/admin/Settings";
import DeliveryPanel from "./pages/admin/DeliveryPanel";
import BankAccountsPanel from "./pages/admin/BankAccountsPanel";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CurrencyProvider>
        <AuthProvider>
          <CartProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public storefront */}
                <Route path="/" element={<Index />} />
                <Route path="/products" element={<Products />} />
                <Route path="/products/:id" element={<ProductDetail />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/order-confirmation" element={<OrderConfirmation />} />

                {/* Admin auth */}
                <Route path="/admin/login" element={<AdminLogin />} />

                {/* Admin protected routes */}
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="products" element={<ProductsPanel />} />
                  <Route path="orders" element={<OrdersPanel />} />
                  <Route path="categories" element={<CategoriesPanel />} />
                  <Route path="users" element={<UsersPanel />} />
                  <Route path="delivery" element={<DeliveryPanel />} />
                  <Route path="payments" element={<BankAccountsPanel />} />
                  <Route path="settings" element={<Settings />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </CartProvider>
        </AuthProvider>
      </CurrencyProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
