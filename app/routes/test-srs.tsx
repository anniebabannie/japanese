import { testSRSFunctions } from "../lib/test-srs";

export async function loader() {
  try {
    await testSRSFunctions();
    return { success: true, message: "SRS functions tested successfully" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export default function TestSRS() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">SRS Test Results</h1>
      <p className="text-green-600">Check the server console for test results!</p>
    </div>
  );
} 