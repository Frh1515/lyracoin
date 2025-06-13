import { supabase } from './client';

export async function updateUserProfile(
  data: {
    username?: string;
    profile_image?: File;
  }
): Promise<{
  success: boolean;
  message: string;
  profile_image_url?: string;
}> {
  try {
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        message: 'User not authenticated'
      };
    }

    let updateData: any = {};
    let profileImageUrl: string | undefined;

    // Handle username update
    if (data.username !== undefined) {
      updateData.username = data.username;
    }

    // Handle profile image upload
    if (data.profile_image) {
      const file = data.profile_image;
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/profile.${fileExt}`;

      // Upload image to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      profileImageUrl = urlData.publicUrl;
      updateData.profile_image = profileImageUrl;
    }

    // Update user profile in database
    if (Object.keys(updateData).length > 0) {
      const { error: dbError } = await supabase
        .from('users')
        .update(updateData)
        .eq('supabase_auth_id', user.id);

      if (dbError) {
        throw dbError;
      }
    }

    return {
      success: true,
      message: 'Profile updated successfully',
      profile_image_url: profileImageUrl
    };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return {
      success: false,
      message: 'Failed to update profile'
    };
  }
}