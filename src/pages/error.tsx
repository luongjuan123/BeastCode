import React from "react";
import { useRouter } from "next/router";
import ErrorDisplay, { ErrorType } from "@/components/UI/ErrorDisplay";

export default function DynamicErrorPage() {
	const router = useRouter();
	const { type } = router.query;

	// Cast query param to ErrorType, default to '500' if not recognized
	const errorType = (type && typeof type === "string") ? (type as ErrorType) : "500";

	return <ErrorDisplay type={errorType} />;
}
