package com.mealapp.domain.recipe.repository;

import com.mealapp.domain.recipe.entity.RecipeFavorite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface RecipeFavoriteRepository extends JpaRepository<RecipeFavorite, Long> {
    Optional<RecipeFavorite> findByUserIdAndRecipeId(String userId, Long recipeId);
    boolean existsByUserIdAndRecipeId(String userId, Long recipeId);
    void deleteByUserIdAndRecipeId(String userId, Long recipeId);

    @Query("SELECT CASE WHEN COUNT(rf) > 0 THEN true ELSE false END FROM RecipeFavorite rf " +
           "WHERE rf.active = true AND rf.userId = :userId AND " +
           "(rf.recipe.id = :rootId OR rf.recipe.parentId = :rootId)")
    boolean existsByUserIdAndRecipeFamily(@Param("userId") String userId, @Param("rootId") Long rootId);

    @Modifying
    @Query("DELETE FROM RecipeFavorite rf WHERE rf.userId = :userId AND " +
           "(rf.recipe.id = :rootId OR rf.recipe.parentId = :rootId)")
    void deleteByUserIdAndRecipeFamily(@Param("userId") String userId, @Param("rootId") Long rootId);
}
