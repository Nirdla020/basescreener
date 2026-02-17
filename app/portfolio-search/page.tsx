import PortfolioSearch from "@/app/components/PortfolioSearch";

export const metadata = {
  title: "Portfolio Search",
  description: "Search a Zora user (ENS/handle) or wallet to view their public portfolio.",
};

export default function PortfolioSearchPage() {
  return (
    <main className="min-h-[70vh] bg-black">
      <PortfolioSearch />
    </main>
  );
}