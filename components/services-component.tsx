import { cn } from "@/lib/utils";
import {
  IconBolt,            // For Instant Flash Loans
  IconShieldLock,       // For ZK Proof KYC Verification
  IconRepeat,           // For Secure Loan Repayment
  IconCloud,      // For 100% Uptime guarantee
} from "@tabler/icons-react";

export default function FeaturesSectionDemo() {
  const features = [
    {
      title: "Instant Flash Loans",
      description:
        "Access lightning-fast loans with zero collateral, anytime, anywhere.",
      icon: <IconBolt />,
    },
    {
      title: "ZK Proof KYC Verification",
      description:
        "Experience private, secure, and decentralized identity verification—your data stays yours.",
      icon: <IconShieldLock />,
    },
    {
      title: "Secure Loan Repayment",
      description:
        "Trustless smart contracts ensure seamless and secure repayments, every time.",
      icon: <IconRepeat />,
    },
    {
      title: "100% Uptime guarantee",
      description: "User-friendly design with intuitive flows—launch, borrow, and repay in just a few clicks.",
      icon: <IconCloud />,
    },
  ];
  return (
    <>
      <div className="text-center mt-12 mb-8">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-8">
          Our Services
        </h2>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
        Discover the next generation of DeFi features, blending privacy, speed and security for a seamless experience.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4  relative z-10 py-10 max-w-7xl mx-auto">
        {features.map((feature, index) => (
          <Feature key={feature.title} {...feature} index={index} />
        ))}
      </div>
    </>
  );
}

const Feature = ({
  title,
  description,
  icon,
  index,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  index: number;
}) => {
  return (
    <div
      className={cn(
        "flex flex-col lg:border-r py-10 relative group/feature dark:border-neutral-800 transition-colors duration-200",
        (index === 0 || index === 4) && "lg:border-l dark:border-neutral-800"
      )}
    >
      <div className="mb-4 relative z-10 px-10 text-white dark:text-neutral-400">
        {icon}
      </div>
      <div className="text-lg font-bold mb-2 relative z-10 px-10">
        <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-neutral-300 dark:bg-neutral-700 transition-all duration-200 origin-center" />
        <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-white dark:text-neutral-100">
          {title}
        </span>
      </div>
      <p className="text-sm text-gray-400 dark:text-neutral-300 max-w-xs relative z-10 px-10">
        {description}
      </p>
    </div>
  );
};