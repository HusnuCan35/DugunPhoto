"use client";
import { useState, useEffect } from "react";
import { supabase } from "../src/lib/supabaseClient";

export default function BucketCreator() {
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function createBucket() {
      try {
        setStatus("Bucket kontrol ediliyor...");
        
        // Mevcut bucketları kontrol et
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();
        
        if (listError) {
          console.error("Bucket listesi alınamadı:", listError);
          setError("Bucket listesi alınamadı: " + listError.message);
          return;
        }
        
        const photoBucket = buckets?.find(b => b.name === "photos");
        
        if (photoBucket) {
          setStatus("'photos' bucket zaten var");
          return;
        }
        
        // Bucket yoksa oluştur
        setStatus("'photos' bucket oluşturuluyor...");
        const { error: createError } = await supabase.storage.createBucket("photos", {
          public: true
        });
        
        if (createError) {
          console.error("Bucket oluşturulamadı:", createError);
          setError("Bucket oluşturulamadı: " + createError.message);
          return;
        }
        
        setStatus("Bucket başarıyla oluşturuldu");
      } catch (err) {
        console.error("Beklenmeyen hata:", err);
        setError("Bir hata oluştu");
      }
    }
    
    createBucket();
  }, []);

  if (error) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-red-500 text-white p-2 text-center text-xs">
        {error}
      </div>
    );
  }
  
  return null; // Normal kullanımda görünmez
} 