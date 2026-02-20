import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import QuickActions from '../components/QuickActions';
import ActivityCard from '../components/ActivityCard';
import SuggestionList from '../components/SuggestionList';
import BottomNav from '../components/BottomNav';
import QuickReportButton from '../components/QuickReportButton';
import HomeHealthScore from '../components/HomeHealthScore';
import SeasonalNudge from '../components/SeasonalNudge';
import UserAssetsCard from '../components/dashboard/UserAssetsCard';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const navigate = useNavigate();
    return (
        <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-background-light dark:bg-background-dark pb-[90px] overflow-x-hidden shadow-2xl">
            <Header />
            <SearchBar />
            <main className="flex-1 flex flex-col gap-5 pt-2 page-enter">
                {/* Health Score — motivational anchor at top */}
                <HomeHealthScore />
                <UserAssetsCard />
                {/* Seasonal nudge — contextual triggers */}
                <SeasonalNudge />
                {/* Quick Actions — primary CTA grid */}
                <QuickActions />
                {/* Continue Activity — ongoing task persistence */}
                <ActivityCard />
                {/* Suggestions — variable reward scroll */}
                <SuggestionList />
            </main>
            <QuickReportButton onPress={() => navigate('/quick-report')} />
            <BottomNav />
        </div>
    );
};

export default Dashboard;
