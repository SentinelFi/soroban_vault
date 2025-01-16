import Link from "next/link";

const Nav = () => {
  return (
    <nav className="my-4">
      <Link href="/" className="mr-4 text-blue-500 hover:text-blue-700">
        HOME
      </Link>
      <Link href="/counter" className="mr-4 text-blue-500 hover:text-blue-700">
        COUNTER
      </Link>
    </nav>
  );
};

export default Nav;
