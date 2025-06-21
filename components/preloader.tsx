import Loader from "@/components/3d-box-loader-animation";

const Preloader = () => {
  return (
    <div className="flex flex-col w-full h-min-screen items-center justify-center min-h-screen bg-[#0D001D]">
      <Loader />
      <h2 className="mt-20 text-2xl font-semibold text-white text-center">
        Welcome to Aarkham<br />
      </h2>
    </div>
  );
};

export default Preloader;
