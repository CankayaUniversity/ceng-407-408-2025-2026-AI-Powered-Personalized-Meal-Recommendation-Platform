package com.mealapp.domain.recommendation.entity;

import com.mealapp.domain.common.entity.BaseEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "recommendation_menus")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecommendationMenu extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recommendation_id", nullable = false)
    private Recommendation recommendation;

    @Column(name = "rank", nullable = false)
    private int rank;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String insight;

    private Double totalKcal;
    private Double totalProtein;
    private Double totalCarbs;
    private Double totalFat;
    private Integer totalPreparationTime;

    @OneToMany(mappedBy = "menu", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("category ASC")
    @Builder.Default
    private List<RecommendationMenuCourse> courses = new ArrayList<>();

    public void addCourse(RecommendationMenuCourse course) {
        courses.add(course);
        course.setMenu(this);
    }
}
