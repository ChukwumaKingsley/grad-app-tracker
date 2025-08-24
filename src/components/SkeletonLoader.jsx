import React from 'react';

export function SkeletonCard() {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="h-6 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2 animate-pulse" />
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-2 animate-pulse" />
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-2 animate-pulse" />
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2 animate-pulse" />
      <div className="h-2.5 bg-gray-200 rounded-full w-full mb-2 animate-pulse" />
      <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse" />
    </div>
  );
}

export function SkeletonDetail() {
  return (
    <div className="bg-white p-8 rounded-lg shadow-md">
      {/* Breadcrumbs */}
      <div className="h-4 bg-gray-200 rounded w-1/4 mb-6 animate-pulse" />
      {/* Header and Button */}
      <div className="flex justify-between items-center mb-6">
        <div className="h-8 bg-gray-200 rounded w-1/2 animate-pulse" />
        <div className="h-10 bg-gray-200 rounded w-24 animate-pulse" />
      </div>
      {/* Country and Level */}
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-4 animate-pulse" />
      {/* Status and Funding */}
      <div className="h-4 bg-gray-200 rounded w-1/4 mb-4 animate-pulse" />
      <div className="h-4 bg-gray-200 rounded w-1/4 mb-4 animate-pulse" />
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="h-2.5 bg-gray-200 rounded-full w-full mb-2 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded w-1/5 animate-pulse" />
      </div>
      {/* Important Dates Section */}
      <div className="mb-6">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2 animate-pulse" />
      </div>
      {/* Requirements Section */}
      <div className="mb-6">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
      </div>
      {/* Recommenders Section */}
      <div className="mb-6">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4 animate-pulse" />
        <div className="w-full border-collapse">
          <div className="flex bg-gray-200 animate-pulse">
            <div className="h-4 w-1/4 p-2 rounded" />
            <div className="h-4 w-1/4 p-2 rounded" />
            <div className="h-4 w-1/4 p-2 rounded" />
            <div className="h-4 w-1/4 p-2 rounded" />
          </div>
          <div className="border-b py-2">
            <div className="flex">
              <div className="h-8 w-1/4 p-2 rounded bg-gray-200 animate-pulse" />
              <div className="h-8 w-1/4 p-2 rounded bg-gray-200 animate-pulse" />
              <div className="h-8 w-1/4 p-2 rounded bg-gray-200 animate-pulse" />
              <div className="h-8 w-1/4 p-2 rounded bg-gray-200 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
      {/* Links Section */}
      <div>
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
      </div>
    </div>
  );
}