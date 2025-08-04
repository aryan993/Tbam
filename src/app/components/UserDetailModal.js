"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function UserDetailModal({ id, onClose }) {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Simplified image state
  const [images, setImages] = useState({
    user: {
      profile: { url: null, file: null },
      poster: { url: null, file: null },
      anniversary: { url: null, file: null }
    },
    partner: {
      profile: { url: null, file: null },
      poster: { url: null, file: null },
      anniversary: { url: null, file: null }
    }
  });

  // Combined loading states for downloads
  const [downloadStates, setDownloadStates] = useState({
    user: {
      profile: false,
      poster: false,
      anniversary: false
    },
    partner: {
      profile: false,
      poster: false,
      anniversary: false
    }
  });

  // Helper function to construct image URLs
  const getImageUrl = (userId, type = 'profile') => {
    let filename = userId;
    if (type === 'poster') filename += '_poster.jpg';
    else if (type === 'anniversary') filename += '_anniv.jpg';
    else filename += '.jpg';
    
    return `/api/profile/image?filename=${filename}&cacheBust=${Date.now()}`;
  };

  useEffect(() => {
    if (id) {
      // Reset all image URLs when id changes
      setImages({
        user: {
          profile: { url: null, file: null },
          poster: { url: null, file: null },
          anniversary: { url: null, file: null }
        },
        partner: {
          profile: { url: null, file: null },
          poster: { url: null, file: null },
          anniversary: { url: null, file: null }
        }
      });
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/user?id=${id}`);
        const data = await res.json();

        if (cancelled) return;

        setUser(data);
        setFormData(JSON.parse(JSON.stringify(data)));

        // Set image URLs directly
        setImages({
          user: {
            profile: { url: getImageUrl(data.id), file: null },
            poster: { url: getImageUrl(data.id, 'poster'), file: null },
            anniversary: { url: getImageUrl(data.id, 'anniversary'), file: null }
          },
          partner: data.partner?.id ? {
            profile: { url: getImageUrl(data.partner.id), file: null },
            poster: { url: getImageUrl(data.partner.id, 'poster'), file: null },
            anniversary: { url: getImageUrl(data.partner.id, 'anniversary'), file: null }
          } : {
            profile: { url: null, file: null },
            poster: { url: null, file: null },
            anniversary: { url: null, file: null }
          }
        });
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchUserData();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleImageSelect = (e, isUser) => {
    if (isLoading) return;
    
    const file = e.target.files[0];
    if (!file || file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB.");
      return;
    }
    const url = URL.createObjectURL(file);
    setImages(prev => ({
      ...prev,
      [isUser ? 'user' : 'partner']: {
        ...prev[isUser ? 'user' : 'partner'],
        profile: { url, file }
      }
    }));
  };

  const handlePosterSelect = (e, isUser, isAnniversary = false) => {
    if (isLoading) return;
    
    const file = e.target.files[0];
    if (!file || file.size > 5 * 1024 * 1024) {
      alert("Poster must be under 5MB.");
      return;
    }
    const url = URL.createObjectURL(file);
    const type = isAnniversary ? 'anniversary' : 'poster';
    
    setImages(prev => ({
      ...prev,
      [isUser ? 'user' : 'partner']: {
        ...prev[isUser ? 'user' : 'partner'],
        [type]: { url, file }
      }
    }));
  };

  const handleDownload = async (userId, isUser = true, type = 'profile') => {
    try {
      setIsLoading(true);
      setDownloadStates(prev => ({
        ...prev,
        [isUser ? 'user' : 'partner']: {
          ...prev[isUser ? 'user' : 'partner'],
          [type]: true
        }
      }));

      const endpoint = type === 'profile' ? "/api/profile/download" : "/api/poster/download";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          fileName: userId,
          category: type === 'anniversary' ? 'anniversary' : undefined
        }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      
      const link = document.createElement("a");
      link.href = data.downloadUrl;
      link.download = data.fileName || `${userId}${type === 'poster' ? '_poster.jpg' : type === 'anniversary' ? '_anniv.jpg' : '.jpg'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert(`${type === 'profile' ? 'Profile' : 'Poster'} download failed`);
    } finally {
      setDownloadStates(prev => ({
        ...prev,
        [isUser ? 'user' : 'partner']: {
          ...prev[isUser ? 'user' : 'partner'],
          [type]: false
        }
      }));
      setIsLoading(false);
    }
  };

  
const handleDelete = async (id, isUser, type = 'profile') => {
  if (isLoading) return;

  const confirmed = window.confirm(`Are you sure you want to delete this ${type} image?`);
  if (!confirmed) return;

  try {
    setIsLoading(true);

    const endpoint = type === "profile" ? "/api/profile/delete" : "/api/poster/delete";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        category: type === "anniversary" ? "anniversary" : undefined,
      }),
    });

    if (!res.ok) throw new Error("Failed to delete");

    // Success: close modal
    onClose();
  } catch (err) {
    console.error(err);
    alert("Delete failed");
  } finally {
    setIsLoading(false);
  }
};


  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setIsLoading(true);
    try {
      // Save user data
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed to save");

      // Prepare all uploads
      const uploads = [];

      // User uploads
      if (images.user.profile.file) {
        const f = new FormData();
        f.append("file", images.user.profile.file);
        f.append("id", user.id);
        uploads.push(() => fetch("/api/profile/upload", { method: "POST", body: f }));
      }

      if (images.user.poster.file) {
        const f = new FormData();
        f.append("file", images.user.poster.file);
        f.append("id", user.id);
        uploads.push(() => fetch("/api/poster/upload", { method: "POST", body: f }));
      }

      if (images.user.anniversary.file) {
        const f = new FormData();
        f.append("file", images.user.anniversary.file);
        f.append("id", user.id);
        f.append("category", "anniversary");
        uploads.push(() => fetch("/api/poster/upload", { method: "POST", body: f }));
      }

      // Partner uploads
      if (user.partner?.id) {
        if (images.partner.profile.file) {
          const f = new FormData();
          f.append("file", images.partner.profile.file);
          f.append("id", user.partner.id);
          uploads.push(() => fetch("/api/profile/upload", { method: "POST", body: f }));
        }

        if (images.partner.poster.file) {
          const f = new FormData();
          f.append("file", images.partner.poster.file);
          f.append("id", user.partner.id);
          uploads.push(() => fetch("/api/poster/upload", { method: "POST", body: f }));
        }

        if (images.partner.anniversary.file) {
          const f = new FormData();
          f.append("file", images.partner.anniversary.file);
          f.append("id", user.partner.id);
          f.append("category", "anniversary");
          uploads.push(() => fetch("/api/poster/upload", { method: "POST", body: f }));
        }
      }

      // Execute uploads one-by-one
      for (const upload of uploads) {
        try {
          await upload();
        } catch (err) {
          console.error("One of the uploads failed:", err);
          throw new Error("Upload failed");
        }
      }

      onClose();
    } catch (err) {
      console.error(err);
      alert("Submit failed");
    } finally {
      setIsSubmitting(false);
      setIsLoading(false);
    }
  };

  const handleInputChange = (path, value) => {
    if (isLoading) return;
    setFormData((prev) => {
      const newData = { ...prev };
      const keys = path.split(".");
      let obj = newData;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys.at(-1)] = value;
      return newData;
    });
  };

  const renderImage = (imageData, alt, userId, isUser = true) => {
    return (
      <div className="text-center w-24">
        <label className="block cursor-pointer">
          <input 
            type="file" 
            accept="image/*" 
            hidden 
            onChange={(e) => handleImageSelect(e, isUser)} 
            disabled={isLoading}
          />
          <div className="w-24 h-24 border rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
            {imageData.url ? (
              <Image 
                src={imageData.url} 
                alt={alt} 
                width={96} 
                height={96} 
                className="object-cover"
                unoptimized
                onError={(e) => {
                  setImages(prev => ({
                    ...prev,
                    [isUser ? 'user' : 'partner']: {
                      ...prev[isUser ? 'user' : 'partner'],
                      profile: { url: null, file: null }
                    }
                  }));
                }}
              />
            ) : <span className="text-xs">No Image</span>}
          </div>
        </label>
        <div className="mt-2 text-xs">
          <div><strong>ID:</strong> {userId}</div>
          <label className="flex justify-center items-center gap-1 mt-1">
            <input 
              type="checkbox" 
              checked={isUser ? formData.active : formData.partner?.active}
              onChange={(e) => handleInputChange(isUser ? "active" : "partner.active", e.target.checked)} 
              disabled={isLoading}
            />
            Active
          </label>
          <button 
            type="button" 
            onClick={() => handleDownload(userId, isUser, 'profile')} 
            disabled={!imageData.url || isLoading || downloadStates[isUser ? 'user' : 'partner'].profile}
            className="mt-1 px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
          >
            {downloadStates[isUser ? 'user' : 'partner'].profile ? "Downloading..." : "Download"}
          </button>
          <button 
            type="button" 
            onClick={() => handleDelete(userId, isUser, 'profile')} 
            disabled={!imageData.url || isLoading || downloadStates[isUser ? 'user' : 'partner'].profile}
            className="mt-1 px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
          >
            Delete Profile
          </button>
        </div>
      </div>
    );
  };

  const renderPoster = (posterData, alt, userId, isUser = true, isAnniversary = false) => {
    const type = isAnniversary ? 'anniversary' : 'poster';
    return (
      <div className="text-center w-32">
        <label className="block cursor-pointer">
          <input 
            type="file" 
            accept="image/*" 
            hidden 
            onChange={(e) => handlePosterSelect(e, isUser, isAnniversary)} 
            disabled={isLoading}
          />
          <div className="w-32 h-48 border rounded-md bg-gray-100 flex items-center justify-center overflow-hidden">
            {posterData.url ? (
              <Image 
                src={posterData.url} 
                alt={alt} 
                width={128} 
                height={192} 
                className="object-cover"
                unoptimized
                onError={(e) => {
                  setImages(prev => ({
                    ...prev,
                    [isUser ? 'user' : 'partner']: {
                      ...prev[isUser ? 'user' : 'partner'],
                      [type]: { url: null, file: null }
                    }
                  }));
                }}
              />
            ) : <span className="text-xs">No Poster</span>}
          </div>
        </label>
        <button 
          type="button" 
          onClick={() => handleDownload(userId, isUser, type)} 
          disabled={!posterData.url || isLoading || downloadStates[isUser ? 'user' : 'partner'][type]}
          className="mt-2 text-xs px-2 py-1 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60"
        >
          {downloadStates[isUser ? 'user' : 'partner'][type] ? "Downloading..." : "Download"}
        </button>
        <button 
          type="button" 
          onClick={() => handleDelete(userId, isUser, type)} 
          disabled={!posterData.url || isLoading || downloadStates[isUser ? 'user' : 'partner'][type]}
          className="mt-1 px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
        >
          Delete Poster
        </button>
      </div>
    );
  };

  const renderDateInputs = (path) => {
    const value = path.split(".").reduce((acc, key) => acc?.[key], formData) || "";
    const [, month = "", day = ""] = value.split("-");
    const months = [...Array(12)].map((_, i) => i + 1);
    const days = [...Array(31)].map((_, i) => i + 1);
    return (
      <div className="flex gap-2">
        <select 
          value={+day || ""} 
          onChange={(e) => updateDate("day", e.target.value)} 
          className="w-1/2 border p-1 rounded text-sm"
          disabled={isLoading}
        >
          <option value="">Day</option>{days.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select 
          value={+month || ""} 
          onChange={(e) => updateDate("month", e.target.value)} 
          className="w-1/2 border p-1 rounded text-sm"
          disabled={isLoading}
        >
          <option value="">Month</option>{months.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
    );
    function updateDate(part, val) {
      const [year = "2000", m = "01", d = "01"] = value.split("-");
      const newDate = `${year}-${part === "month" ? val.padStart(2, "0") : m}-${part === "day" ? val.padStart(2, "0") : d}`;
      handleInputChange(path, newDate);
    }
  };

  if (!id || !user || !formData) return null;

  return (
    <div className="fixed inset-0 bg-white bg-opacity-90 z-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg w-full h-full relative shadow-lg overflow-y-auto pb-6">
        <button 
          onClick={onClose} 
          className="absolute top-2 right-2 text-xl"
          disabled={isLoading}
        >
          ✕
        </button>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">User Details</h2>
          {isLoading && (
            <div className="text-sm text-blue-600">Processing...</div>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-8 text-sm">
          {/* USER ROW */}
          <div className="grid grid-cols-8 gap-4 items-start">
            <div className="col-span-1">
              {renderImage(images.user.profile, "User", user.id, true)}
            </div>

            <div className="col-span-4 grid grid-cols-3 gap-3">
              <Input label="Name" path="name" value={formData.name} onChange={handleInputChange} disabled={isLoading} />
              <Select label="Role" path="role" value={formData.role} onChange={handleInputChange}
                options={["District Team", "Influencer President", "Influencer Secretary"]} disabled={isLoading} />
              <Select label="Type" path="type" value={formData.type} onChange={handleInputChange}
                options={["member", "spouse"]} disabled={isLoading} />
              <Input label="Club" path="club" value={formData.club} onChange={handleInputChange} disabled={isLoading} />
              <Input label="Email" path="email" value={formData.email} onChange={handleInputChange} disabled={isLoading} />
              <Input label="Phone" path="phone" value={formData.phone} onChange={handleInputChange} disabled={isLoading} />
              <div><Label text="DOB" />{renderDateInputs("dob")}</div>
              <div><Label text="Anniversary" />{renderDateInputs("anniversary")}</div>
            </div>

            <div className="col-span-1">
              {renderPoster(images.user.poster, "User Poster", user.id, true)}
            </div>

            {formData.type === "member" && (
              <div className="col-span-1">
                {renderPoster(images.user.anniversary, "User Anniv Poster", user.id, true, true)}
              </div>
            )}
          </div>

          {/* PARTNER ROW */}
          {formData.partner && (
            <div className="grid grid-cols-8 gap-4 items-start">
              <div className="col-span-1">
                {renderImage(images.partner.profile, "Partner", formData.partner.id, false)}
              </div>

              <div className="col-span-4 grid grid-cols-3 gap-3">
                <Input label="Name" path="partner.name" value={formData.partner.name} onChange={handleInputChange} disabled={isLoading} />
                <Select label="Role" path="partner.role" value={formData.partner.role} onChange={handleInputChange}
                  options={["District Team", "Influencer President", "Influencer Secretary"]} disabled={isLoading} />
                <Select label="Type" path="partner.type" value={formData.partner.type} onChange={handleInputChange}
                  options={["member", "spouse"]} disabled={isLoading} />
                <Input label="Club" path="partner.club" value={formData.partner.club} onChange={handleInputChange} disabled={isLoading} />
                <Input label="Email" path="partner.email" value={formData.partner.email} onChange={handleInputChange} disabled={isLoading} />
                <Input label="Phone" path="partner.phone" value={formData.partner.phone} onChange={handleInputChange} disabled={isLoading} />
                <div><Label text="DOB" />{renderDateInputs("partner.dob")}</div>
              </div>

              <div className="col-span-1">
                {renderPoster(images.partner.poster, "Partner Poster", formData.partner.id, false)}
              </div>

              {formData.partner.type === "member" && (
                <div className="col-span-1">
                  {renderPoster(images.partner.anniversary, "Partner Anniv Poster", formData.partner.id, false, true)}
                </div>
              )}
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <div className="text-center pt-4">
            <button 
              type="submit" 
              disabled={isSubmitting || isLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Updating..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const Input = ({ label, path, value, onChange, disabled }) => (
  <div>
    <Label text={label} />
    <input 
      value={value || ""} 
      onChange={(e) => onChange(path, e.target.value)}
      className="border rounded p-1 w-full disabled:opacity-60" 
      disabled={disabled}
    />
  </div>
);

const Select = ({ label, path, value, onChange, options = [], disabled }) => (
  <div>
    <Label text={label} />
    <select 
      value={value || ""} 
      onChange={(e) => onChange(path, e.target.value)}
      className="border rounded p-1 w-full disabled:opacity-60"
      disabled={disabled}
    >
      <option value="">--Select--</option>
      {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

const Label = ({ text }) => (
  <label className="block mb-1 font-medium text-gray-700">{text}</label>
);