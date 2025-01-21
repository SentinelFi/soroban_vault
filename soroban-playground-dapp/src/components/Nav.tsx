import Link from "next/link";

const Nav = () => {
  return (
    <nav className="my-4">
      <Link href="/" className="mr-4 text-blue-500 hover:text-blue-700">
        SEND
      </Link>
      <Link href="/balances" className="mr-4 text-blue-500 hover:text-blue-700">
        BALANCES
      </Link>
      <Link href="/counter" className="mr-4 text-blue-500 hover:text-blue-700">
        COUNTER
      </Link>
      <Link href="/fees" className="mr-4 text-blue-500 hover:text-blue-700">
        FEES
      </Link>
      <Link href="/params" className="mr-4 text-blue-500 hover:text-blue-700">
        PARAMS
      </Link>
      <Link href="/faucet" className="mr-4 text-blue-500 hover:text-blue-700">
        FAUCET
      </Link>
      <Link href="/image" className="mr-4 text-blue-500 hover:text-blue-700">
        IMAGE
      </Link>
      <Link href="/errors" className="mr-4 text-blue-500 hover:text-blue-700">
        ERRORS
      </Link>
    </nav>
  );
};

export default Nav;
