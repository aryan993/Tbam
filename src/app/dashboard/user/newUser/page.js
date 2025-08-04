'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PersonForm() {
  const router = useRouter();
  const [anniversary, setAnniversary] = useState({ day: '', month: '' });
  const [person1, setPerson1] = useState(defaultPerson());
  const [person2, setPerson2] = useState(defaultPerson());
  const [imageErrors, setImageErrors] = useState({ person1: null, person2: null });
  const [submitting, setSubmitting] = useState(false);

  function defaultPerson() {
    return {
      name: '',
      club: '',
      email: '',
      phone: '',
      usertype: 'member',
      role: "District Team",
      dob: { day: '', month: '' },
      image: null,
    };
  }

  const formatDate = (day, month) => {
    if (!day || !month) return '';
    const paddedDay = String(day).padStart(2, '0');
    const paddedMonth = String(month).padStart(2, '0');
    return `2000-${paddedMonth}-${paddedDay}`;
  };

  const handleDateChange = (e, person) => {
    const { name, value } = e.target;
    let numericValue = value.replace(/\D/g, '');
    if (name === 'day' && numericValue > 31) numericValue = '31';
    if (name === 'month' && numericValue > 12) numericValue = '12';

    const safeValue = numericValue.toString();

    if (person === 'anniversary') {
      setAnniversary((prev) => ({ ...prev, [name]: safeValue }));
    } else if (person === 'person1') {
      setPerson1((prev) => ({
        ...prev,
        dob: { ...prev.dob, [name]: safeValue },
      }));
    } else {
      setPerson2((prev) => ({
        ...prev,
        dob: { ...prev.dob, [name]: safeValue },
      }));
    }
  };

  const handlePersonChange = (e, person) => {
    const { name, value } = e.target;
    if (person === 'person1') {
      setPerson1((prev) => ({ ...prev, [name]: value }));
    } else {
      setPerson2((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleImageChange = (e, person) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setImageErrors(prev => ({ ...prev, [person]: 'Image must be less than 5MB' }));
      return;
    }

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setImageErrors(prev => ({ ...prev, [person]: 'Only JPEG or PNG images allowed' }));
      return;
    }

    setImageErrors(prev => ({ ...prev, [person]: null }));

    if (person === 'person1') {
      setPerson1((prev) => ({ ...prev, image: file }));
    } else {
      setPerson2((prev) => ({ ...prev, image: file }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (imageErrors.person1 || imageErrors.person2) {
      alert('Please fix image errors before submitting');
      return;
    }

    setSubmitting(true);

    const formData = new FormData();
    formData.append('anniversary', formatDate(anniversary.day, anniversary.month));
    formData.append('name1', person1.name);
    formData.append('club1', person1.club);
    formData.append('email1', person1.email);
    formData.append('phone1', person1.phone);
    formData.append('userType1', person1.usertype);
    formData.append('role1', person1.role);
    formData.append('dob1', formatDate(person1.dob.day, person1.dob.month));
    if (person1.image) formData.append('image1', person1.image);

    formData.append('name2', person2.name);
    formData.append('club2', person2.club);
    formData.append('email2', person2.email);
    formData.append('phone2', person2.phone);
    formData.append('userType2', person2.usertype);
    formData.append('role2', person2.role);
    formData.append('dob2', formatDate(person2.dob.day, person2.dob.month));
    if (person2.image) formData.append('image2', person2.image);

    try {
      const response = await fetch('/api/user', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        alert('Form submitted successfully!');
        // Reset all form data
        setPerson1(defaultPerson());
        setPerson2(defaultPerson());
        setAnniversary({ day: '', month: '' });
        setImageErrors({ person1: null, person2: null });
        router.refresh();
      } else {
        throw new Error('Submission failed');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error submitting form. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 max-w-4xl mx-auto bg-white shadow rounded-md text-sm">
      <h1 className="text-xl font-bold text-gray-800 mb-2">Member and Spouse Form</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PersonSection
          label="Person 1"
          person={person1}
          onChange={handlePersonChange}
          onDateChange={(e) => handleDateChange(e, 'person1')}
          onImageChange={(e) => handleImageChange(e, 'person1')}
          imageError={imageErrors.person1}
        />
        <PersonSection
          label="Person 2"
          person={person2}
          onChange={handlePersonChange}
          onDateChange={(e) => handleDateChange(e, 'person2')}
          onImageChange={(e) => handleImageChange(e, 'person2')}
          imageError={imageErrors.person2}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <input
          type="text"
          className="border rounded p-1 w-1/2"
          placeholder="Anniversary Day (1-31)"
          name="day"
          value={anniversary.day}
          onChange={(e) => handleDateChange(e, 'anniversary')}
        />
        <input
          type="text"
          className="border rounded p-1 w-1/2"
          placeholder="Anniversary Month (1-12)"
          name="month"
          value={anniversary.month}
          onChange={(e) => handleDateChange(e, 'anniversary')}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full md:w-auto px-4 py-1 font-medium rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
      >
        {submitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}

function PersonSection({ label, person, onChange, onDateChange, onImageChange, imageError }) {
  const key = label.toLowerCase().replace(' ', '');

  return (
    <div className="space-y-3">
      <h2 className="text-blue-600 font-semibold">{label}</h2>

      <input type="text" name="name" className="w-full border rounded p-1" placeholder="Name" value={person.name} onChange={(e) => onChange(e, key)} />
      <input type="email" name="email" className="w-full border rounded p-1" placeholder="Email" value={person.email} onChange={(e) => onChange(e, key)} />
      <input type="text" name="phone" className="w-full border rounded p-1" placeholder="Phone" value={person.phone} onChange={(e) => onChange(e, key)} />
      <input type="text" name="club" className="w-full border rounded p-1" placeholder="Club" value={person.club} onChange={(e) => onChange(e, key)} />

      <div className="flex gap-2">
        <input type="text" className="border rounded p-1 w-1/2" placeholder="Day (1-31)" name="day" value={person.dob.day} onChange={onDateChange} />
        <input type="text" className="border rounded p-1 w-1/2" placeholder="Month (1-12)" name="month" value={person.dob.month} onChange={onDateChange} />
      </div>

      <select name="usertype" className="w-full border rounded p-1" value={person.usertype} onChange={(e) => onChange(e, key)}>
        <option value="member">Member</option>
        <option value="spouse">Spouse</option>
      </select>
      <select name="role" className="w-full border rounded p-1" value={person.role} onChange={(e) => onChange(e, key)}>
        <option value="District Team">District Team</option>
        <option value="Influencer President">Influencer President</option>
        <option value="Influencer Secretary">Influencer Secretary</option>
      </select>

      <div>
        <input type="file" accept="image/png, image/jpeg" className="w-full" onChange={onImageChange} />
        {imageError && <p className="text-red-500 text-xs mt-1">{imageError}</p>}
        {person.image && <p className="text-green-600 text-xs mt-1">Image: {person.image.name}</p>}
      </div>
    </div>
  );
}
