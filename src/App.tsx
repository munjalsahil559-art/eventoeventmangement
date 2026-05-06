import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import EventChatbot from "@/components/EventChatbot";
import Index from "./pages/Index";
import Events from "./pages/Events";
import EventDetails from "./pages/EventDetails";
import Booking from "./pages/Booking";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import ImportEvents from "./pages/ImportEvents";
import Scanner from "./pages/Scanner";
import TicketView from "./pages/TicketView";
import NotFound from "./pages/NotFound";
import SplitPay from "./pages/SplitPay";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Navbar />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/events" element={<Events />} />
            <Route path="/event/:id" element={<EventDetails />} />
            <Route path="/booking/:id" element={<Booking />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/import-events" element={<ImportEvents />} />
            <Route path="/admin/scanner" element={<Scanner />} />
            <Route path="/ticket/:ticketCode" element={<TicketView />} />
            <Route path="/split/:token" element={<SplitPay />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <EventChatbot />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
