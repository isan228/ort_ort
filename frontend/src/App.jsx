import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import SubscriptionPage from './pages/SubscriptionPage.jsx';
import ScoresPage from './pages/ScoresPage.jsx';
import UniversitiesPage from './pages/UniversitiesPage.jsx';
import WalletPage from './pages/WalletPage.jsx';
import CommunityPage from './pages/CommunityPage.jsx';
import AnalysisPage from './pages/AnalysisPage.jsx';
import UniversityPage from './pages/UniversityPage.jsx';
import ProgramPage from './pages/ProgramPage.jsx';
import ToursPage from './pages/ToursPage.jsx';
import TourDetailPage from './pages/TourDetailPage.jsx';
import RankingsPage from './pages/RankingsPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import NewsPage from './pages/NewsPage.jsx';
import NewsDetailPage from './pages/NewsDetailPage.jsx';
import CollectionsPage from './pages/CollectionsPage.jsx';
import SupportPage from './pages/SupportPage.jsx';
import SupportTicketPage from './pages/SupportTicketPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import FaqPage from './pages/FaqPage.jsx';
import LegalPage from './pages/LegalPage.jsx';
import AdminRoute from './components/AdminRoute.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import PlaceholderPage from './pages/PlaceholderPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="universities" element={<UniversitiesPage />} />
        <Route path="universities/:slug" element={<UniversityPage />} />
        <Route path="programs/:slug" element={<ProgramPage />} />
        <Route path="news" element={<NewsPage />} />
        <Route path="news/:slug" element={<NewsDetailPage />} />
        <Route path="legal/privacy" element={<LegalPage type="privacy" />} />
        <Route path="legal/terms" element={<LegalPage type="terms" />} />
        <Route path="legal/offer" element={<LegalPage type="offer" />} />
        <Route path="faq" element={<FaqPage />} />
        <Route path="community" element={<CommunityPage />} />
        <Route path="tours" element={<ToursPage />} />
        <Route path="tours/:id" element={<TourDetailPage />} />
        <Route path="rankings" element={<RankingsPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="analysis" element={<AnalysisPage />} />
          <Route path="subscription" element={<SubscriptionPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="account/scores" element={<ScoresPage />} />
          <Route path="account/wallet" element={<WalletPage />} />
          <Route path="account/notifications" element={<NotificationsPage />} />
          <Route path="account/collections" element={<CollectionsPage />} />
          <Route path="account/support" element={<SupportPage />} />
          <Route path="account/support/:id" element={<SupportTicketPage />} />
        </Route>
        <Route element={<AdminRoute />}>
          <Route path="admin" element={<AdminPage />} />
        </Route>
        <Route path="*" element={<PlaceholderPage title="404" description="Страница не найдена" />} />
      </Route>
    </Routes>
  );
}
